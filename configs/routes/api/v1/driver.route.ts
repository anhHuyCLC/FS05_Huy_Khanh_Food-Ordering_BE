import { action, RailsRoute } from "ts-rails";
import { ValidateDriverRoleMiddleware } from "@middlewares/validateDriverRole.middleware";
import { DriverStatusController } from "@controllers/api/v1/driverStatus.controller";
import { DriverOrderController } from "@controllers/api/v1/driverOrder.controller";
import { DriverLocationController } from "@controllers/api/v1/driverLocation.controller";
import { DriverEarningController } from "@controllers/api/v1/driverEarning.controller";
import { AuthMiddleware } from "@middlewares/auth.middleware";

/**
 * Nhóm chức năng TÀI XẾ — Section 5 của spec
 *
 * Mount point: /api/v1/driver  (đã được thêm vào ApiV1Route)
 *
 * Hầu hết routes đều qua ValidateDriverRoleMiddleware:
 *   - Kiểm tra đăng nhập (Bearer token)
 *   - Kiểm tra role DRIVER
 *   - Kiểm tra DriverProfile APPROVED
 *   - Gán req.driverProfileId cho controllers
 * Route public duy nhất: /location/:driverId
 *
 * Endpoints:
 *   GET    /profile                               — Xem hồ sơ tài xế
 *   PATCH  /status                                — Bật/Tắt nhận đơn
 *   GET    /orders/available                      — Đơn đang chờ tài xế
 *   POST   /orders/:orderId/respond               — Chấp nhận / Bỏ qua
 *   GET    /orders/active                         — Đơn đang giao
 *   PATCH  /orders/:orderId/delivery-status       — Cập nhật trạng thái giao
 *   GET    /orders/history                        — Lịch sử đơn
 *   PATCH  /location                              — Cập nhật vị trí GPS
 *   GET    /location                              — Vị trí hiện tại (của mình)
 *   GET    /location/:driverId                    — Vị trí tài xế (public, khách theo dõi)
 *   GET    /heatmap                               — Bản đồ nhiệt nhu cầu
 *   POST   /route-optimize                        — Tối ưu hóa lộ trình
 *   GET    /earnings                              — Thu nhập & ví
 */
export class DriverRouteV1 extends RailsRoute {
  public draw() {
    console.log("DriverRouteV1 loaded");
    // Route public (khách hàng dùng để theo dõi tài xế - không cần driver role)
    // this.get("/location/:driverId", action(DriverLocationController, "getDriverLocation"));

    this.path(action(AuthMiddleware));

    // Middleware kiểm tra đăng nhập + role DRIVER + profile APPROVED
    this.path(action(ValidateDriverRoleMiddleware));

    // ── Hồ sơ ──────────────────────────────────────────────────────────────
    this.get("/profile", action(DriverStatusController, "show"));

    // ── 5.1 Trạng thái nhận đơn ──────────────────────────────────────────
    this.patch("/status", action(DriverStatusController, "updateStatus"));

    // ── 5.1 Quản lý đơn hàng ────────────────────────────────────────────
    // Specific routes phải khai báo TRƯỚC dynamic routes (:orderId)
    this.get("/orders/available", action(DriverOrderController, "available"));
    this.get("/orders/active",    action(DriverOrderController, "active"));
    this.get("/orders/history",   action(DriverOrderController, "history"));

    this.post("/orders/:orderId/respond",          action(DriverOrderController, "respond"));
    this.patch("/orders/:orderId/delivery-status", action(DriverOrderController, "updateDeliveryStatus"));

    // ── 5.1 Vị trí & Bản đồ ─────────────────────────────────────────────
    this.patch("/location",          action(DriverLocationController, "updateLocation"));
    this.get("/location",            action(DriverLocationController, "getLocation"));

    // ── 5.1 Bản đồ nhiệt ────────────────────────────────────────────────
    this.get("/heatmap", action(DriverLocationController, "heatmap"));

    // ── 5.1 Tối ưu hóa lộ trình ─────────────────────────────────────────
    this.post("/route-optimize", action(DriverLocationController, "routeOptimize"));

    // ── 5.2 Thu nhập ────────────────────────────────────────────────────
    this.get("/earnings", action(DriverEarningController, "index"));

    return this;
  }
}
