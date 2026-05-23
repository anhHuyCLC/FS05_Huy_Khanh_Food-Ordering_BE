import { ChatControllerV1 } from "@controllers/api/v1/chat.controller";
import { action, RailsRoute } from "ts-rails";

export class ChatRouteV1 extends RailsRoute {
  public draw() {
    // POST /api/v1/chat
    this.post("/", action(ChatControllerV1, "create"));
  }
}
