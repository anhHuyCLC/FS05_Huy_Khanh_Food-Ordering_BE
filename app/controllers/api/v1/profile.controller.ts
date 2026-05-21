import models from "@models";
import { UpdateProfileValidator } from "@validators/profile.validator";
import { NotFoundError } from "ts-rails";
import { ApiV1Controller } from "./apiV1.controller";
import { ProfileService } from "@services/profile.service";

//permit: lọc các field cần thiết

export class ProfileControllerV1 extends ApiV1Controller {
  private profileService = new ProfileService();

 
  async show() {
    const userId = this.req.params.userId;

    const profile = await this.profileService.getProfileByUserId(userId);

    this.renderJson(profile);
  }

  
  async update() {
    const userId = this.req.params.userId;
    const currentUserId = this.currentUser?.id;

    if (!currentUserId) {
      throw new NotFoundError("User không xác thực");
    }

    const data = await this.params(UpdateProfileValidator).permit(
      "fullName",
      "phone",
      "avatarUrl",
      "isActive",
      "rewardPoints",
      "badgeLevel"
    );

    const updatedProfile = await this.profileService.updateProfile(
      userId,
      data,
      currentUserId
    );

    this.renderJson(updatedProfile);
  }
}
