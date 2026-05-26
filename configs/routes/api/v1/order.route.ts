import { OrderControllerV1 } from "@controllers/api/v1/order.controller";
import { action, RailsRoute } from "ts-rails";

export class OrderRouteV1 extends RailsRoute {
  public draw() {

    this.get("/orders", action(OrderControllerV1, "index"));

    this.post("/orders", action(OrderControllerV1, "create"));

    this.post("/orders/check-promotion", action(OrderControllerV1, "checkPromotion"));

    this.get("/promotions", action(OrderControllerV1, "getPromotions"));

    this.get("/orders/:orderId", action(OrderControllerV1, "show"));

    this.patch("/orders/:orderId/cancel", action(OrderControllerV1, "cancel"));

    this.post("/orders/:orderId/review", action(OrderControllerV1, "createReview"));

    this.get("/orders/:orderId/history", action(OrderControllerV1, "statusHistory"));

    this.patch("/orders/:orderId/status", action(OrderControllerV1, "updateStatus"));

    this.get(
      "/restaurants/:restaurantId/orders",
      action(OrderControllerV1, "restaurantOrders")
    );
  }
}
