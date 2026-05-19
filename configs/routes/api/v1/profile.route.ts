import { ProfileControllerV1 } from "@controllers/api/v1/profile.controller";
import { RailsRoute } from "ts-rails";

export class ProfileRouteV1 extends RailsRoute {
  public draw() {
      this.resource(ProfileControllerV1, {
        document: { tags: ["Profile"] },
      });
    }
  }
