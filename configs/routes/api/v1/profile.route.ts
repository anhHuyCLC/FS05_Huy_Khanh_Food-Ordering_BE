import { ProfileControllerV1 } from "@controllers/api/v1/profile.controller";
import { action, RailsRoute } from "ts-rails";

export class ProfileRouteV1 extends RailsRoute {
  public draw() {
    this.get("/:userId", action(ProfileControllerV1, "show"));
    this.put("/:userId", action(ProfileControllerV1, "update"));
    return this;
  }
}
