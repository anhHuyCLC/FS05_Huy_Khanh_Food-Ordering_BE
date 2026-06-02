import { FavoriteRestaurantControllerV1 } from "@controllers/api/v1/favoriteRestaurant.controller";
import { action, RailsRoute } from "ts-rails";

export class FavoriteRouteV1 extends RailsRoute {
  public draw() {
    this.post("/restaurants/:restaurantId/favorite", action(FavoriteRestaurantControllerV1, "toggle"));
    this.get("/profiles/favorites", action(FavoriteRestaurantControllerV1, "index"));
  }
}
