import { Feature } from "@configs/enum";
import { ApiV1AdminDashboardController } from "@controllers/api";
import { action, RailsRoute } from "ts-rails";

export class ApiV1AdminDashboardRoute extends RailsRoute {
  public draw() {
    this.get("/kpis", action(ApiV1AdminDashboardController, "kpis"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.get("/revenue", action(ApiV1AdminDashboardController, "revenue"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.get("/categories/stats", action(ApiV1AdminDashboardController, "categoryStats"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.get("/orders", action(ApiV1AdminDashboardController, "orders"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.get("/restaurants/pending", action(ApiV1AdminDashboardController, "pendingRestaurants"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.patch("/restaurants/:restaurantId/status", action(ApiV1AdminDashboardController, "updateRestaurantStatus"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.get("/drivers/pending", action(ApiV1AdminDashboardController, "pendingDrivers"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.patch("/drivers/:driverId/status", action(ApiV1AdminDashboardController, "updateDriverStatus"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.get("/fraud-alerts", action(ApiV1AdminDashboardController, "fraudAlerts"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.patch("/users/status", action(ApiV1AdminDashboardController, "updateUserStatus"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.get("/restaurants/active", action(ApiV1AdminDashboardController, "activeRestaurants"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.get("/drivers/active", action(ApiV1AdminDashboardController, "activeDrivers"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.get("/announcements", action(ApiV1AdminDashboardController, "getAnnouncements"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.post("/announcements", action(ApiV1AdminDashboardController, "createAnnouncement"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.delete("/announcements/:id", action(ApiV1AdminDashboardController, "deleteAnnouncement"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.get("/settings", action(ApiV1AdminDashboardController, "getSettings"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.put("/settings", action(ApiV1AdminDashboardController, "updateSettings"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.get("/payouts", action(ApiV1AdminDashboardController, "payouts"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.get("/reports", action(ApiV1AdminDashboardController, "reports"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.patch("/reports/:id", action(ApiV1AdminDashboardController, "moderateReport"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    // ── Wallet Requests (Yêu cầu nạp/rút ví tài xế) ─────────────────────────
    this.get("/wallet-requests", action(ApiV1AdminDashboardController, "walletRequests"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.patch("/wallet-requests/:requestId/approve", action(ApiV1AdminDashboardController, "approveWalletRequest"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });

    this.patch("/wallet-requests/:requestId/reject", action(ApiV1AdminDashboardController, "rejectWalletRequest"), {
      setPermissionForAny: [Feature.AdministrationManagement],
    });
  }
}


