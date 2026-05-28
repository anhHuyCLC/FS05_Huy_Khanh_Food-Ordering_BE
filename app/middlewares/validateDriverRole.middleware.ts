import { NextFunction, Request, Response } from "express";
import { ApplicationMiddleware } from "./application.middleware";
import models from "@models";

/**
 * ValidateDriverRoleMiddleware
 * - Đảm bảo user đã đăng nhập (req.user tồn tại)
 * - Đảm bảo user có role DRIVER
 * - Đảm bảo user có DriverProfile (đã được tạo + duyệt APPROVED)
 * - Gán req.driverProfileId để các controller dùng trực tiếp
 *
 * Cách dùng trong route:
 *   this.path(action(ValidateDriverRoleMiddleware));
 */
export class ValidateDriverRoleMiddleware extends ApplicationMiddleware {
  public async execute(req: Request, res: Response, next: NextFunction) {
    // 1. Kiểm tra đã đăng nhập
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Bạn chưa đăng nhập",
      });
    }

    // 2. Kiểm tra role DRIVER qua bảng UserToRole
    const userRole = await models.userToRole.findFirst({
      where: {
        userId: req.user.id,
        role: { code: "DRIVER", deleted: false },
      },
    });

    if (!userRole) {
      return res.status(403).json({
        success: false,
        error: "Tài khoản không có quyền truy cập chức năng tài xế",
      });
    }

    // 3. Kiểm tra DriverProfile tồn tại
    const profile = await models.profile.findUnique({
      where: { userId: req.user.id },
      include: { driverProfile: true },
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: "Hồ sơ người dùng không tìm thấy",
      });
    }

    if (!profile.driverProfile) {
      return res.status(403).json({
        success: false,
        error: "Bạn chưa có hồ sơ tài xế. Vui lòng đăng ký tài xế trước.",
      });
    }

    // 4. Kiểm tra approval status
    if (profile.driverProfile.approvalStatus === "PENDING") {
      return res.status(403).json({
        success: false,
        error: "Hồ sơ tài xế đang chờ Admin duyệt",
      });
    }

    if (profile.driverProfile.approvalStatus === "REJECTED") {
      return res.status(403).json({
        success: false,
        error: `Hồ sơ tài xế bị từ chối${profile.driverProfile.rejectionReason ? ": " + profile.driverProfile.rejectionReason : ""}`,
      });
    }
    // console.log("USER =", req.user);
    // console.log("ROLES =", req.user?.roles);
    // console.log("PROFILE =", profile);  

    // 5. Gán driverProfileId vào req để controller dùng
    (req as any).driverProfileId = profile.driverProfile.id;

    next();
  }
}
