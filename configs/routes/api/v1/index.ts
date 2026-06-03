import env from "@configs/env";
import { MyPermissionController, UploadControllerV1 } from "@controllers/api";
import { action, RailsRoute } from "ts-rails";
import { AddressRouteV1 } from "./address.route";
import { ApiV1AdminRoute } from "./admin";
import { AuthRoute } from "./auth";
import { CartRouteV1 } from "./cart.route";
import { ChatRouteV1 } from "./chat.route";
import { ApiV1DevRoute } from "./dev";
import { MenuItemRouteV1 } from "./menuItem.route";
import { OrderRouteV1 } from "./order.route";
import { PaymentRouteV1 } from "./payment.route";
import { DriverRouteV1 } from "./driver.route";
import { ProfileRouteV1 } from "./profile.route";
import { RestaurantRoute } from "./restaurant.route";
import { MapRouteV1 } from "./map.route";
import { DriverLocationController } from "@controllers/api/v1/driverLocation.controller";
import { SocialPostRoute } from "./socialPost.route";
import { FavoriteRouteV1 } from "./favorite.route";
import { fileUploader } from "@lib";

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

    // Favorite routes
    this.path("/", FavoriteRouteV1.draw());

    // Profile routes
    this.path("/profiles", ProfileRouteV1.draw());

    // Social Post routes
    this.path("/social-posts", SocialPostRoute.draw());

    // File upload route
    this.post("/upload", [fileUploader.single("file"), action(UploadControllerV1, "upload")]);

    // Menu Item routes
    this.path("/", MenuItemRouteV1.draw());

    // Chat routes
    this.path("/chat", ChatRouteV1.draw());

    // Order routes
    this.path("/", OrderRouteV1.draw());

    // Payment routes
    this.path("/", PaymentRouteV1.draw());

    // Cart routes
    this.path("/", CartRouteV1.draw());

     this.get(
      "/driver/location/:driverId",
      action(DriverLocationController, "getDriverLocation")
    );

    // Driver routes
    this.path("/driver", DriverRouteV1.draw());


    // Address routes
    this.path("/", AddressRouteV1.draw());

    // Map routes
    this.path("/", MapRouteV1.draw());

    // Admin routes - yêu cầu AM permission
    this.path("/admin", ApiV1AdminRoute.draw());
  }

}
