import models from "@models";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "ts-rails";

export class DriverStatusService {
  /**
   * 5.1 Bật / Tắt trạng thái nhận đơn
   * currentStatus: "online" | "offline" | "busy"
   */

  async updateStatus(profileId: string, status: string) {
    const allowed = ["online", "offline"];
    if (!allowed.includes(status)) {
      throw new BadRequestError(
        `Chỉ có thể chuyển sang: ${allowed.join(", ")}. Trạng thái "busy" được set tự động khi nhận đơn.`,
      );
    }

    const driver = await models.driverProfile.findUnique({
      where: { id: profileId },
    });
    if (!driver) throw new NotFoundError("Hồ sơ tài xế không tìm thấy");

    if (driver.approvalStatus !== "APPROVED") {
      throw new ForbiddenError("Tài khoản tài xế chưa được duyệt");
    }
    // Không cho offline khi đang có đơn active
    if (status === "offline") {
      const activeOrderCount = await models.order.count({
        where: {
          driverId: profileId,
          status: { in: ["accepted", "preparing", "ready", "delivering"] },
        },
      });
      if (activeOrderCount > 0) {
        throw new BadRequestError(
          `Bạn đang có ${activeOrderCount} đơn chưa hoàn thành. Hoàn thành trước khi offline.`,
        );
      }
    }
    const updated = await models.driverProfile.update({
      where: { id: profileId },
      data: { currentStatus: status },
    });

    return {
      id: updated.id,
      currentStatus: updated.currentStatus,
      message:
        status === "online"
          ? "Bạn đã BẬT nhận đơn"
          : status === "offline"
            ? "Bạn đã TẮT nhận đơn"
            : "Trạng thái cập nhật thành công",
    };
  }

  /**
   * Lấy thông tin DriverProfile + Profile tổng hợp
   */
  async getProfile(profileId: string) {
    const driver = await models.driverProfile.findUnique({
      where: { id: profileId },
      include: {
        profile: {
          select: {
            fullName: true,
            avatarUrl: true,
            phone: true,
          },
        },
      },
    });
    if (!driver) throw new NotFoundError("Hồ sơ tài xế không tìm thấy");
    return driver;
  }
}
