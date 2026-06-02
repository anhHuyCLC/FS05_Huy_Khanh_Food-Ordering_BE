import { ApplicationChannel } from "./application.channel";

/**
 * OrderChannel — Real-time WebSocket cho khách hàng theo dõi đơn hàng
 *
 * Events từ CLIENT → SERVER:
 *   "join_order_tracking"   { orderId }   — Customer join room theo dõi đơn
 *
 * Rooms:
 *   "order:{orderId}"       — Room theo dõi đơn cụ thể (customer + driver cùng join)
 *   "restaurant:{restaurantId}" — Room cho restaurant dashboard
 *   "admin"                 — Room cho admin dashboard
 */
export class OrderChannel extends ApplicationChannel {
  async subscribe() {
    if (!(await this.ensureAuthenticated())) return;

    // Customer join room theo dõi đơn hàng cụ thể
    this.socket.on("join_order_tracking", (data: unknown) => {
      const orderId = (data as { orderId?: string })?.orderId;
      if (orderId) {
        this.join(`order:${orderId}`);
        this.socket.emit("order:tracking_joined", { orderId });
      }
    });

    // Restaurant dashboard join room nhận updates
    this.socket.on("join_restaurant_room", (data: unknown) => {
      const restaurantId = (data as { restaurantId?: string })?.restaurantId;
      if (restaurantId) {
        this.join(`restaurant:${restaurantId}`);
      }
    });

    // Admin dashboard join room
    this.socket.on("join_admin_room", () => {
      this.join("admin");
    });
  }
}
