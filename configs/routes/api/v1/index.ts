import env from "@configs/env";
import { MyPermissionController } from "@controllers/api";
import { ValidateUserLoginMiddleware } from "@middlewares";
import { action, RailsRoute } from "ts-rails";
import { ApiV1AdminRoute } from "./admin";
import { AuthRoute } from "./auth";
import { ApiV1DevRoute } from "./dev";
import { RestaurantRoute } from "./restaurant";
import { ProfileRouteV1 } from "./profile.route";
import { MenuItemRouteV1 } from "./menuItem.route";
import { ChatRouteV1 } from "./chat.route";
import { OrderRouteV1 } from "./order.route";
import { CartRouteV1 } from "./cart.route";

export class ApiV1Route extends RailsRoute {
  public draw() {
    if (env.nodeEnv === "development") {
      this.path("/dev", ApiV1DevRoute.draw());
    }

    this.path("/auth", AuthRoute.draw());
    this.path("/restaurant", RestaurantRoute.draw());

    // this.path(action(ValidateUserLoginMiddleware));

    // Permission routes - action(Controller, "index") tạo instance mới mỗi request
    this.get("/permissions/me", action(MyPermissionController, "index"));

    // Profile routes
    this.path("/profiles", ProfileRouteV1.draw());

    // Menu Item routes
    this.path("/", MenuItemRouteV1.draw());

    // Chat routes
    this.path("/chat", ChatRouteV1.draw());

    // Order routes
    this.path("/", OrderRouteV1.draw());

    // Cart routes
    this.path("/", CartRouteV1.draw());

    // Admin routes - yêu cầu AM permission
    this.path("/admin", ApiV1AdminRoute.draw());
  }
}
