import { action, RailsRoute } from "ts-rails";
import { ApiV1RestaurantController } from "../../../../../app/controllers/api";

export class RestaurantRoute extends RailsRoute {
  public draw() {
    this.get("/list", action(ApiV1RestaurantController, "restaurantList"), {
      document: {
        summary: "Get restaurant list",
        tags: ["Restaurant"],
        responses: {
          200: "Success",
          401: "Unauthorized",
        },
      },
    });
  }
}