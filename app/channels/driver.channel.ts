import { IsNotEmpty, IsNumber, IsString, IsUUID, Max, Min, validate } from "class-validator";
import models from "@models";
import { ApplicationChannel } from "./application.channel";

// ── Validators ──────────────────────────────────────────────────────────────

class LocationUpdateValidator {
  @IsNumber()
  @Min(-90) @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180) @Max(180)
  longitude!: number;
}

class OrderStatusUpdateValidator {
  @IsUUID("4")
  orderId!: string;

  @IsString()
  @IsNotEmpty()
  status!: string; // "picked_up" | "delivering" | "completed"
}

/**
 * DriverChannel — Real-time WebSocket cho tài xế
 *
 * Events từ CLIENT → SERVER:
 *   "driver:location"         { latitude, longitude }        — Cập nhật vị trí GPS liên tục
 *   "driver:order_status"     { orderId, status }            — Cập nhật trạng thái giao hàng
 *   "driver:status"           { status }                     — Bật/Tắt nhận đơn
 *
 * Events từ SERVER → CLIENT (driver):
 *   "driver:new_order"        { order }                      — Có đơn mới phù hợp vị trí
 *   "driver:order_cancelled"  { orderId }                    — Đơn bị hủy
 *   "driver:location_ack"     { timestamp }                  — Xác nhận vị trí đã lưu
 *
 * Events từ SERVER → CLIENT (customer):
 *   "tracking:location"       { lat, lng, driverId }         — Vị trí tài xế real-time
 *   "tracking:status"         { orderId, status }            — Trạng thái đơn cập nhật
 *
 * Rooms:
 *   "driver:{profileId}"      — Room riêng của mỗi tài xế
 *   "order:{orderId}"         — Room theo dõi từng đơn (tài xế + khách hàng join)
 *   "drivers:available"       — Room broadcast đơn mới cho tất cả tài xế đang online
 */
export class DriverChannel extends ApplicationChannel {

  async subscribe() {
    if (!(await this.ensureAuthenticated())) return;

    const user = await this.getCurrentUser();
    if (!user) return;

    // Lấy profile + driverProfile
    const profile = await models.profile.findUnique({
      where: { userId: user.id },
      include: { driverProfile: true },
    });

    if (!profile?.driverProfile) {
      this.socket.emit("driver:error", { message: "Hồ sơ tài xế không tìm thấy" });
      this.socket.disconnect();
      return;
    }

    if (profile.driverProfile.approvalStatus !== "APPROVED") {
      this.socket.emit("driver:error", { message: "Tài khoản chưa được duyệt" });
      this.socket.disconnect();
      return;
    }

    const driverProfileId = profile.id;

    // Join room riêng của tài xế + room nhận đơn mới
    this.join(`driver:${driverProfileId}`);
    this.join("drivers:available");

    this.socket.emit("driver:connected", {
      driverProfileId,
      currentStatus: profile.driverProfile.currentStatus,
      message: "Kết nối WebSocket thành công",
    });

    // ── Lắng nghe các sự kiện từ client ──────────────────────────────────────

    // 1. Cập nhật vị trí GPS liên tục
    this.socket.on("driver:location", async (data: unknown) => {
      await this.handleLocationUpdate(driverProfileId, data);
    });

    // 2. Cập nhật trạng thái đơn hàng
    this.socket.on("driver:order_status", async (data: unknown) => {
      await this.handleOrderStatusUpdate(driverProfileId, data);
    });

    // 3. Bật/Tắt trạng thái nhận đơn
    this.socket.on("driver:status", async (data: unknown) => {
      await this.handleStatusUpdate(driverProfileId, data);
    });

    // 4. Tài xế join room theo dõi đơn cụ thể (khi nhận đơn)
    this.socket.on("driver:join_order", (data: unknown) => {
      const orderId = (data as any)?.orderId;
      if (orderId) {
        this.join(`order:${orderId}`);
        this.socket.emit("driver:joined_order", { orderId });
      }
    });

    // 5. Cleanup khi disconnect
    this.socket.on("disconnect", async () => {
      // Khi tài xế disconnect, set status offline
      await models.driverProfile.update({
        where: { id: driverProfileId },
        data: { currentStatus: "offline" },
      }).catch(() => {});
    });
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  private async handleLocationUpdate(driverProfileId: string, data: unknown) {
    const payload = data as Record<string, number>;
    const validator = new LocationUpdateValidator();
    validator.latitude = Number(payload?.latitude);
    validator.longitude = Number(payload?.longitude);

    const errors = await validate(validator);
    if (errors.length > 0) {
      this.socket.emit("driver:error", { message: "Tọa độ không hợp lệ" });
      return;
    }

    try {
      // Upsert vị trí vào DB
      await models.driverLocation.upsert({
        where: { driverId: driverProfileId },
        create: {
          driverId: driverProfileId,
          latitude: validator.latitude,
          longitude: validator.longitude,
        },
        update: {
          latitude: validator.latitude,
          longitude: validator.longitude,
        },
      });

      // ACK cho tài xế
      this.socket.emit("driver:location_ack", {
        timestamp: new Date().toISOString(),
      });

      // Broadcast vị trí mới đến room theo dõi tất cả đơn của tài xế
      const activeOrders = await models.order.findMany({
        where: {
          driverId: driverProfileId,
          status: { in: ["accepted", "delivering"] },
        },
        select: { id: true },
      });

      for (const order of activeOrders) {
        this.broadcastTo(`order:${order.id}`, "tracking:location", {
          driverId: driverProfileId,
          lat: validator.latitude,
          lng: validator.longitude,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.socket.emit("driver:error", { message: "Lỗi cập nhật vị trí" });
    }
  }

  private async handleOrderStatusUpdate(driverProfileId: string, data: unknown) {
    const payload = data as Record<string, string>;
    const validator = new OrderStatusUpdateValidator();
    validator.orderId = payload?.orderId ?? "";
    validator.status = payload?.status ?? "";

    const errors = await validate(validator);
    if (errors.length > 0) {
      this.socket.emit("driver:error", { message: "Dữ liệu trạng thái không hợp lệ" });
      return;
    }

    const allowedStatuses = ["picked_up", "delivering", "completed"];
    if (!allowedStatuses.includes(validator.status)) {
      this.socket.emit("driver:error", { message: `Trạng thái không hợp lệ. Cho phép: ${allowedStatuses.join(", ")}` });
      return;
    }

    try {
      const order = await models.order.findUnique({ where: { id: validator.orderId } });
      if (!order || order.driverId !== driverProfileId) {
        this.socket.emit("driver:error", { message: "Đơn hàng không tồn tại hoặc không thuộc về bạn" });
        return;
      }

      // Map status
      const statusMap: Record<string, any> = {
        picked_up:  { status: "delivering", deliveringAt: new Date() },
        delivering: { status: "delivering" },
        completed:  { status: "completed",  completedAt: new Date() },
      };

      const updateData = statusMap[validator.status];
      const updatedOrder = await models.order.update({
        where: { id: validator.orderId },
        data: updateData,
      });

      // Ghi log
      await models.orderStatusHistory.create({
        data: { orderId: validator.orderId, status: updatedOrder.status! },
      });

      // Nếu hoàn thành -> cộng ví + về online
      if (validator.status === "completed") {
        const driver = await models.driverProfile.findUnique({ where: { id: driverProfileId } });
        if (driver) {
          const earning = Number(order.finalAmount) * (Number(driver.commissionRate) / 100);
          await models.driverProfile.update({
            where: { id: driverProfileId },
            data: { walletBalance: { increment: earning }, currentStatus: "online" },
          });
          await models.walletTransaction.create({
            data: {
              driverId: driverProfileId,
              amount: earning,
              transactionType: "earning",
              description: `Thu nhập từ đơn #${validator.orderId.slice(0, 8)}`,
            },
          });
          this.socket.emit("driver:earning", {
            amount: earning,
            message: `+${earning.toLocaleString("vi-VN")}đ đã vào ví`,
          });
        }
      }

      // Broadcast cập nhật trạng thái đến room theo dõi đơn (khách hàng đang xem)
      this.broadcastTo(`order:${validator.orderId}`, "tracking:status", {
        orderId: validator.orderId,
        status: validator.status,
        timestamp: new Date().toISOString(),
      });

      this.socket.emit("driver:order_status_ack", {
        orderId: validator.orderId,
        status: validator.status,
      });

    } catch (error) {
      this.socket.emit("driver:error", { message: "Lỗi cập nhật trạng thái đơn hàng" });
    }
  }

  private async handleStatusUpdate(driverProfileId: string, data: unknown) {
    const status = (data as any)?.status as string;
    const allowed = ["online", "offline", "busy"];
    if (!allowed.includes(status)) {
      this.socket.emit("driver:error", { message: "Trạng thái không hợp lệ" });
      return;
    }

    try {
      await models.driverProfile.update({
        where: { id: driverProfileId },
        data: { currentStatus: status },
      });

      this.socket.emit("driver:status_ack", { status });

      // Rời/join room nhận đơn tùy theo status
      if (status === "offline") {
        this.socket.leave("drivers:available");
      } else if (status === "online") {
        this.join("drivers:available");
      }
    } catch (error) {
      this.socket.emit("driver:error", { message: "Lỗi cập nhật trạng thái" });
    }
  }

  /**
   * Static helper — gọi từ REST controller khi có đơn mới
   * để broadcast đến tất cả tài xế đang online
   */
  static broadcastNewOrder(io: any, order: any) {
    io.to("drivers:available").emit("driver:new_order", {
      orderId: order.id,
      restaurant: order.restaurant,
      deliveryAddress: order.deliveryAddress,
      finalAmount: order.finalAmount,
      orderItems: order.orderItems,
      createdAt: order.createdAt,
    });
  }
}
