import { action, RailsRoute } from "ts-rails";
import { ApiV1RestaurantController } from "@controllers/api/v1/restaurant.controller";
import { AuthMiddleware } from "@middlewares/auth.middleware";

/**
 * Mount point: /api/v1/restaurant
 *
 * Public:
 *   GET  /list                              — Danh sách nhà hàng
 *
 * Auth required:
 *   GET  /me                                — Nhà hàng của tôi (owner)
 *   GET  /:restaurantId/promotions          — Danh sách khuyến mãi
 *   POST /:restaurantId/promotions          — Tạo khuyến mãi / flash sale
 *   PATCH /promotions/:promotionId          — Cập nhật khuyến mãi
 *   DELETE /promotions/:promotionId         — Xóa khuyến mãi
 */
export class RestaurantRoute extends RailsRoute {
  public draw() {
    // ── Public ────────────────────────────────────────────────────────────
    this.get("/list", action(ApiV1RestaurantController, "restaurantList"), {
      document: {
        summary: "Get restaurant list",
        tags: ["Restaurant"],
        responses: { 200: "Success", 401: "Unauthorized" },
      },
    });

    this.get("/recommendations", action(ApiV1RestaurantController, "getRecommendations"));

    this.get("/:restaurantId/active-promotions", action(ApiV1RestaurantController, "activePromotions"));

    // ── Auth required ─────────────────────────────────────────────────────
    this.path(action(AuthMiddleware));

    // Nhà hàng của owner hiện tại
    this.get("/me", action(ApiV1RestaurantController, "myRestaurant"));

    // Promotions / Flash Sale
    this.get("/:restaurantId/promotions",  action(ApiV1RestaurantController, "listPromotions"));
    this.post("/:restaurantId/promotions", action(ApiV1RestaurantController, "createPromotion"));
    this.patch("/promotions/:promotionId", action(ApiV1RestaurantController, "updatePromotion"));
    this.delete("/promotions/:promotionId", action(ApiV1RestaurantController, "deletePromotion"));

    this.get(
      "/:restaurantId/combo-suggestions",
      action(ApiV1RestaurantController, "comboSuggestions")
    );

    this.patch("/promotions/:promotionId/toggle", action(ApiV1RestaurantController, "togglePromotion"));

    return this;
  }
}