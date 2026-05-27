import { SocialPostControllerV1 } from "@controllers/api";
import { action, RailsRoute } from "ts-rails";

export class SocialPostRoute extends RailsRoute {
  public draw() {
    this.get("/", action(SocialPostControllerV1, "index"));
    this.post("/", action(SocialPostControllerV1, "create"));
    this.get("/leaderboard", action(SocialPostControllerV1, "leaderboard"));
    this.get("/:id", action(SocialPostControllerV1, "show"));
    this.patch("/:id", action(SocialPostControllerV1, "update"));
    this.delete("/:id", action(SocialPostControllerV1, "destroy"));
    this.post("/:id/like", action(SocialPostControllerV1, "toggleLike"));
    this.post("/:id/comments", action(SocialPostControllerV1, "createComment"));
    this.get("/:id/comments", action(SocialPostControllerV1, "indexComments"));
    this.post("/:id/share", action(SocialPostControllerV1, "share"));
    
    // Follow routes
    this.post("/users/:profileId/follow", action(SocialPostControllerV1, "toggleFollow"));
    this.get("/users/:profileId/follow-status", action(SocialPostControllerV1, "followStatus"));
  }
}
