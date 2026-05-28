import { MenuItemControllerV1 } from "@controllers/api/v1/menuItem.controller";
import { action, RailsRoute } from "ts-rails";
import { AuthMiddleware } from "@middlewares/auth.middleware";

export class MenuItemRouteV1 extends RailsRoute {
  public draw() {
    // GET /restaurants/:restaurantId/menu-items
    this.get("/restaurants/:restaurantId/menu-items", action(MenuItemControllerV1, "index"));
    // GET /menu-items/:menuItemId
    this.get("/menu-items/:menuItemId", action(MenuItemControllerV1, "show"));
    
    this.path(action(AuthMiddleware));


    // POST /restaurants/:restaurantId/menu-items
    this.post("/restaurants/:restaurantId/menu-items", action(MenuItemControllerV1, "create"));


    // PUT /menu-items/:menuItemId
    this.put("/menu-items/:menuItemId", action(MenuItemControllerV1, "update"));

    // DELETE /menu-items/:menuItemId
    this.delete("/menu-items/:menuItemId", action(MenuItemControllerV1, "destroy"));

    // PATCH /menu-items/:menuItemId/availability
    this.patch("/menu-items/:menuItemId/availability", action(MenuItemControllerV1, "updateAvailability"));
  }
}
