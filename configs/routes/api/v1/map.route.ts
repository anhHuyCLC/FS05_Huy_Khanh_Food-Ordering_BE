import { MapControllerV1 } from "@controllers/api/v1/map.controller";
import { action, RailsRoute } from "ts-rails";

export class MapRouteV1 extends RailsRoute {
  public draw() {
    this.get("/maps/autocomplete", action(MapControllerV1, "autocomplete"));
    this.get("/maps/geocode", action(MapControllerV1, "geocode"));
    this.post("/maps/route", action(MapControllerV1, "route"));
    this.get("/maps/distance", action(MapControllerV1, "distance"));
  }
}
