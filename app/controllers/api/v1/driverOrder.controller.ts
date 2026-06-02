// ============================================================
// app/controllers/api/v1/driver/driverOrder.controller.ts
// ============================================================
import { ApiV1Controller } from "..";
import { DriverOrderService } from "@services/driverOrder.service";
import {
  RespondOrderValidator,
  UpdateOrderDeliveryStatusValidator,
} from "@validators/driver.validator";
import { DriverChannel } from "@channels/driver.channel";

export class DriverOrderController extends ApiV1Controller {
  private service = new DriverOrderService();

  /** GET /api/v1/driver/orders/available */
  async available() {
    const profileId = (this.req as any).driverProfileId as string;
   
    const orders = await this.service.getAvailableOrders(profileId);
    this.renderJson({ success: true, data: orders, count: orders.length });
  }

  /** GET /api/v1/driver/orders/active */
  async active() {
    const profileId = (this.req as any).driverProfileId as string;
    const orders = await this.service.getMyActiveOrders(profileId);
    this.renderJson({ success: true, data: orders });
  }

  /** GET /api/v1/driver/orders/history */
  async history() {
    const profileId = (this.req as any).driverProfileId as string;
    const skip = parseInt(this.req.query.skip as string) || 0;
    const take = parseInt(this.req.query.take as string) || 20;
    const orders = await this.service.getOrderHistory(profileId, skip, take);
    this.renderJson({ success: true, data: orders });
  }

  /** POST /api/v1/driver/orders/:orderId/respond */
  async respond() {
    const profileId = (this.req as any).driverProfileId as string;
    const orderId = this.req.params.orderId;
    const { action, reason } = await this.params(RespondOrderValidator).permit("action", "reason");

    let result;
    if (action === "accepted") {
      result = await this.service.acceptOrder(profileId, orderId);

      // Broadcast qua WebSocket: thông báo cho khách hàng đơn đã có tài xế
      try {
        const io = (this.req as any).app?.get("io");
        if (io) {
          io.to(`order:${orderId}`).emit("tracking:driver_assigned", {
            orderId,
            driverId: profileId,
            message: "Tài xế đã nhận đơn của bạn",
          });
          const restaurantId = result?.restaurantId;
          if (restaurantId) io.to(`restaurant:${restaurantId}`).emit("order:status_changed", { orderId });
          io.to("admin").emit("order:status_changed", { orderId });
        }
      } catch (_) {}
    } else {
      result = await this.service.rejectOrder(profileId, orderId, reason);
    }

    this.renderJson({ success: true, data: result });
  }

  /** PATCH /api/v1/driver/orders/:orderId/delivery-status */
  async updateDeliveryStatus() {
    const profileId = (this.req as any).driverProfileId as string;
    const orderId = this.req.params.orderId;
    const { status } = await this.params(UpdateOrderDeliveryStatusValidator).permit("status");

    const result = await this.service.updateDeliveryStatus(profileId, orderId, status!);

    // Broadcast cập nhật trạng thái qua WebSocket
    try {
      const io = (this.req as any).app?.get("io");
      if (io) {
        io.to(`order:${orderId}`).emit("tracking:status", {
          orderId,
          status,
          timestamp: new Date().toISOString(),
        });
        const restaurantId = result?.order?.restaurantId;
        if (restaurantId) io.to(`restaurant:${restaurantId}`).emit("order:status_changed", { orderId, status });
        io.to("admin").emit("order:status_changed", { orderId, status });
      }
    } catch (_) {}

    this.renderJson({ success: true, data: result });
  }
}
