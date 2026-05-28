import { ApiV1Controller } from "./apiV1.controller";
import { RestaurantService } from "@services/restaurant.service"
import { RecommendationService } from "@services/recommendation.service";
import { UnauthorizedError } from "ts-rails";

export class ApiV1RestaurantController extends ApiV1Controller {
  async restaurantList() {
    const result = await RestaurantService.restaurantList();
    this.renderJson(result);
  }

  async myRestaurant() {
    const result = await RestaurantService.myRestaurant(
      this.currentUser?.profileId
    );

    this.renderJson({
      success: true,
      data: result,
    });
  }

  async listPromotions() {
    const result = await RestaurantService.listPromotions(
      this.req.params.restaurantId,
      this.currentUser?.profileId
    );

    this.renderJson({
      success: true,
      data: result,
    });
  }

  async createPromotion() {
    const result = await RestaurantService.createPromotion(
      this.req.params.restaurantId,
      this.currentUser?.profileId,
      this.req.body
    );

    this.renderJson(
      {
        success: true,
        message: "Tạo khuyến mãi thành công",
        data: result,
      },
      201
    );
  }

  async updatePromotion() {
    const result = await RestaurantService.updatePromotion(
      this.req.params.promotionId,
      this.currentUser?.profileId,
      this.req.body
    );

    this.renderJson({
      success: true,
      message: "Cập nhật khuyến mãi thành công",
      data: result,
    });
  }

  async deletePromotion() {
    await RestaurantService.deletePromotion(
      this.req.params.promotionId,
      this.currentUser?.profileId
    );

    this.renderJson({
      success: true,
      message: "Xóa khuyến mãi thành công",
    });
  }

  async comboSuggestions() {
    if (!this.currentUser?.id) {
      throw new UnauthorizedError("Cần đăng nhập để xem gợi ý combo");
    }

    const restaurantId = this.req.params.restaurantId;
    const result = await RecommendationService.getComboSuggestions(
      this.currentUser.id,
      restaurantId
    );

    this.renderJson({
      success: true,
      data: result,
    });
  }
  async togglePromotion() {
  const result = await RestaurantService.togglePromotion(
    this.req.params.promotionId,
    this.currentUser?.profileId,
    this.req.body.isActive
  );
  this.renderJson({
    success: true,
    message: result.isActive ? "Đã bật khuyến mãi" : "Đã tắt khuyến mãi",
    data: result,
  });
}
}
