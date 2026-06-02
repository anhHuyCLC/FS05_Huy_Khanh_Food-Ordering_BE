import { ApiV1Controller } from "./apiV1.controller";
import { RestaurantService } from "@services/restaurant.service"
import { RecommendationService } from "@services/recommendation.service";
import { UnauthorizedError } from "ts-rails";
import models from "@models";

export class ApiV1RestaurantController extends ApiV1Controller {
  async restaurantList() {
    const result = await RestaurantService.restaurantList();
    this.renderJson(result);
  }

  async myRestaurant() {
    const result = await RestaurantService.myRestaurant(
      this.currentUser?.profileId
    );

    this.renderJson(result);
  }

  async listPromotions() {
    const result = await RestaurantService.listPromotions(
      this.req.params.restaurantId,
      this.currentUser?.profileId
    );

    this.renderJson(result);
  }

  async createPromotion() {
    const result = await RestaurantService.createPromotion(
      this.req.params.restaurantId,
      this.currentUser?.profileId,
      this.req.body
    );

    this.renderJson(result, 201);
  }

  async updatePromotion() {
    const result = await RestaurantService.updatePromotion(
      this.req.params.promotionId,
      this.currentUser?.profileId,
      this.req.body
    );

    this.renderJson(result);
  }

  async deletePromotion() {
    await RestaurantService.deletePromotion(
      this.req.params.promotionId,
      this.currentUser?.profileId
    );

    this.renderJson(null);
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

    this.renderJson(result);
  }
  async togglePromotion() {
    const result = await RestaurantService.togglePromotion(
      this.req.params.promotionId,
      this.currentUser?.profileId,
      this.req.body.isActive
    );
    this.renderJson(result);
  }

  private async getProfileId(): Promise<string | null> {
    const userId = this.currentUser?.id;
    if (!userId) return null;
    const profile = await models.profile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return profile?.id || null;
  }

  async getRecommendations() {
    const profileId = await this.getProfileId();
    let result: any[] = [];

    if (profileId) {
      const recentOrders = await models.order.findMany({
        where: { customerId: profileId, status: "completed" },
        select: { restaurantId: true },
        orderBy: { createdAt: "desc" },
        take: 5,
        distinct: ["restaurantId"],
      });

      const orderedRestIds = recentOrders.map(o => o.restaurantId);
      if (orderedRestIds.length > 0) {
        result = await models.restaurant.findMany({
          where: {
            id: { in: orderedRestIds },
            isActive: true,
            approvalStatus: "APPROVED",
          },
          include: {
            categories: true,
          },
        });
      }
    }

    if (result.length < 4) {
      const excludedIds = result.map(r => r.id);
      const topRated = await models.restaurant.findMany({
        where: {
          id: { notIn: excludedIds },
          isActive: true,
          approvalStatus: "APPROVED",
        },
        include: {
          categories: true,
        },
        orderBy: { rating: "desc" },
        take: 4 - result.length,
      });
      result = [...result, ...topRated];
    }

    this.renderJson(result);
  }
}
