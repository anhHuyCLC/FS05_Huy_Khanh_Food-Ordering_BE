import { ApiV1Controller } from "./apiV1.controller";

export class ApiV1RestaurantController extends ApiV1Controller {
  async restaurantList() {
    const result = await this.models.restaurant.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        imageUrl: true,
        latitude: true,
        longitude: true,
        rating: true,
        isActive: true,
        createdAt: true,
        owner: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
            sortOrder: true,
          },
        },
        menuItems: {
          select: {
            id: true,
            categoryId: true,
            name: true,
            description: true,
            basePrice: true,
            imageUrl: true,
            isAvailable: true,
            optionGroups: {
              include: {
                choices: true,
              },
            },
          },
        },
      },
    });
    this.renderJson(result);
  }
}