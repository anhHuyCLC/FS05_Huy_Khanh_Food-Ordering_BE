import { NextFunction, Request, Response } from "express";
import { ApplicationMiddleware } from "./application.middleware";
import models from "@models";

/**
 * ValidateRestaurantOwnerMiddleware
 *
 * Dùng cho các route cần xác nhận user là owner của nhà hàng.
 * Yêu cầu:
 *   - AuthMiddleware đã chạy trước (req.user tồn tại)
 *   - Route có param :restaurantId
 *
 * Sau khi pass middleware:
 *   - req.restaurantId được gán = restaurantId đã verify
 */
export class ValidateRestaurantOwnerMiddleware extends ApplicationMiddleware {
  public async execute(req: Request, res: Response, next: NextFunction) {
    try {
      const profileId = req.user?.profileId;
      if (!profileId) {
        return res.status(401).json({ success: false, error: "Cần đăng nhập" });
      }

      const restaurantId = req.params.restaurantId;
      if (!restaurantId) {
        return res.status(400).json({ success: false, error: "Thiếu restaurantId" });
      }

      const restaurant = await models.restaurant.findUnique({
        where: { id: restaurantId },
        select: { ownerId: true, isActive: true },
      });

      if (!restaurant) {
        return res.status(404).json({ success: false, error: "Nhà hàng không tìm thấy" });
      }

      if (restaurant.ownerId !== profileId) {
        return res.status(403).json({ success: false, error: "Bạn không có quyền thao tác với nhà hàng này" });
      }

      // Gán vào req để controller dùng lại
      (req as any).restaurantId = restaurantId;

      next();
    } catch (error) {
      return res.status(500).json({ success: false, error: "Lỗi xác thực quyền nhà hàng" });
    }
  }
}