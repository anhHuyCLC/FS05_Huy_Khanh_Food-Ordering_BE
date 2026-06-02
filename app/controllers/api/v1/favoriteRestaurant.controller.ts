import { ApiV1Controller } from "./apiV1.controller";
import models from "@models";
import { NotFoundError, UnauthorizedError } from "ts-rails";

export class FavoriteRestaurantControllerV1 extends ApiV1Controller {
  private async getProfileId(): Promise<string> {
    const userId = this.currentUser?.id;
    if (!userId) throw new UnauthorizedError("Cần đăng nhập");

    const profile = await models.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) throw new NotFoundError("Profile không tồn tại");
    return profile.id;
  }

  /**
   * POST /restaurants/:restaurantId/favorite
   * Toggle favorite status
   */
  async toggle() {
    const profileId = await this.getProfileId();
    const { restaurantId } = this.req.params;

    const restaurant = await models.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundError("Nhà hàng không tồn tại");
    }

    const existing = await models.favoriteRestaurant.findUnique({
      where: {
        profileId_restaurantId: {
          profileId,
          restaurantId,
        },
      },
    });

    let favorited = false;
    if (existing) {
      await models.favoriteRestaurant.delete({
        where: {
          profileId_restaurantId: {
            profileId,
            restaurantId,
          },
        },
      });
    } else {
      await models.favoriteRestaurant.create({
        data: {
          profileId,
          restaurantId,
        },
      });
      favorited = true;
    }

    this.renderJson({
      success: true,
      favorited,
      message: favorited ? "Đã thêm vào danh sách yêu thích" : "Đã xóa khỏi danh sách yêu thích",
    });
  }

  /**
   * GET /profiles/favorites
   * List user's favorite restaurants
   */
  async index() {
    const profileId = await this.getProfileId();

    const favorites = await models.favoriteRestaurant.findMany({
      where: { profileId },
      include: {
        restaurant: {
          include: {
            categories: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = favorites.map((f) => ({
      id: f.restaurant.id,
      name: f.restaurant.name,
      address: f.restaurant.address,
      imageUrl: f.restaurant.imageUrl,
      latitude: f.restaurant.latitude,
      longitude: f.restaurant.longitude,
      isActive: f.restaurant.isActive,
      rating: f.restaurant.rating,
      categories: f.restaurant.categories.map((c) => ({
        id: c.id,
        name: c.name,
      })),
    }));

    this.renderJson(result);
  }
}
