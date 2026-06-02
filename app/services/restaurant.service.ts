import models from "@models";
import { NotFoundError, UnauthorizedError } from "ts-rails";

export class RestaurantService {
  static async restaurantList() {
    return await models.restaurant.findMany({
      where: { isActive: true },
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
  }

  static async myRestaurant(profileId?: string) {
    if (!profileId) {
      throw new UnauthorizedError("Cần đăng nhập");
    }

    const restaurant = await models.restaurant.findFirst({
      where: {
        ownerId: profileId,
      },

      include: {
        categories: {
          orderBy: {
            sortOrder: "asc",
          },
        },

        promotions: {
          where: {
            isActive: true,
          },

          orderBy: {
            validFrom: "desc",
          },
        },

        _count: {
          select: {
            menuItems: true,
            orders: true,
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundError("Nhà hàng không tìm thấy");
    }

    return restaurant;
  }

  static async listPromotions(
    restaurantId: string,
    profileId?: string
  ) {
    if (!profileId) {
      throw new UnauthorizedError("Cần đăng nhập");
    }

    const restaurant = await models.restaurant.findUnique({
      where: { id: restaurantId },
      select: { ownerId: true },
    });

    if (!restaurant) {
      throw new NotFoundError("Nhà hàng không tìm thấy");
    }

    if (restaurant.ownerId !== profileId) {
      throw new UnauthorizedError("Không có quyền");
    }

    return await models.promotion.findMany({
      where: { restaurantId },

      include: {
        applicableItems: {
          select: {
            id: true,
            name: true,
          },
        },
      },

      orderBy: {
        validFrom: "desc",
      },
    });
  }

  static async activePromotions(restaurantId: string) {
    const restaurant = await models.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundError("Nhà hàng không tìm thấy");
    }

    const now = new Date();
    return await models.promotion.findMany({
      where: {
        restaurantId,
        isActive: true,
        validFrom: { lte: now },
        validTo: { gte: now },
      },
      include: {
        applicableItems: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        validFrom: "desc",
      },
    });
  }

  static async createPromotion(
    restaurantId: string,
    profileId: string | undefined,
    body: any
  ) {
    if (!profileId) {
      throw new UnauthorizedError("Cần đăng nhập");
    }

    const restaurant = await models.restaurant.findUnique({
      where: { id: restaurantId },
      select: { ownerId: true },
    });

    if (!restaurant) {
      throw new NotFoundError("Nhà hàng không tìm thấy");
    }

    if (restaurant.ownerId !== profileId) {
      throw new UnauthorizedError("Không có quyền");
    }

    return await models.promotion.create({
      data: {
        restaurantId,
        code: body.code,
        description: body.description ?? null,
        discountPercentage: body.discountPercentage ?? null,
        fixedDiscount: body.fixedDiscount ?? null,
        minOrderValue: body.minOrderValue ?? 0,
        validFrom: new Date(body.validFrom),
        validTo: new Date(body.validTo),
        isActive: body.isActive ?? true,

        ...(body.menuItemIds?.length
          ? {
              applicableItems: {
                connect: body.menuItemIds.map((id: string) => ({
                  id,
                })),
              },
            }
          : {}),
      },

      include: {
        applicableItems: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  static async updatePromotion(
    promotionId: string,
    profileId: string | undefined,
    body: any
  ) {
    if (!profileId) {
      throw new UnauthorizedError("Cần đăng nhập");
    }

    const existing = await models.promotion.findUnique({
      where: {
        id: promotionId,
      },

      include: {
        restaurant: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError("Khuyến mãi không tìm thấy");
    }

    if (existing.restaurant?.ownerId !== profileId) {
      throw new UnauthorizedError("Không có quyền");
    }

    return await models.promotion.update({
      where: {
        id: promotionId,
      },

      data: {
        ...(body.code !== undefined && {
          code: body.code,
        }),

        ...(body.description !== undefined && {
          description: body.description,
        }),

        ...(body.discountPercentage !== undefined && {
          discountPercentage: body.discountPercentage,
        }),

        ...(body.fixedDiscount !== undefined && {
          fixedDiscount: body.fixedDiscount,
        }),

        ...(body.minOrderValue !== undefined && {
          minOrderValue: body.minOrderValue,
        }),

        ...(body.validFrom !== undefined && {
          validFrom: new Date(body.validFrom),
        }),

        ...(body.validTo !== undefined && {
          validTo: new Date(body.validTo),
        }),

        ...(body.isActive !== undefined && {
          isActive: body.isActive,
        }),

        ...(body.menuItemIds !== undefined && {
          applicableItems: {
            set: body.menuItemIds.map((id: string) => ({
              id,
            })),
          },
        }),
      },

      include: {
        applicableItems: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  static async deletePromotion(
    promotionId: string,
    profileId?: string
  ) {
    if (!profileId) {
      throw new UnauthorizedError("Cần đăng nhập");
    }

    const existing = await models.promotion.findUnique({
      where: {
        id: promotionId,
      },

      include: {
        restaurant: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError("Khuyến mãi không tìm thấy");
    }

    if (existing.restaurant?.ownerId !== profileId) {
      throw new UnauthorizedError("Không có quyền");
    }

    await models.promotion.delete({
      where: {
        id: promotionId,
      },
    });
  }
  static async togglePromotion(
  promotionId: string,
  profileId: string | undefined,
  isActive: boolean
) {
  if (!profileId) throw new UnauthorizedError("Cần đăng nhập");

  const existing = await models.promotion.findUnique({
    where: { id: promotionId },
    include: { restaurant: { select: { ownerId: true } } },
  });

  if (!existing) throw new NotFoundError("Khuyến mãi không tìm thấy");
  if (existing.restaurant?.ownerId !== profileId)
    throw new UnauthorizedError("Không có quyền");

  return models.promotion.update({
    where: { id: promotionId },
    data: { isActive },
  });
}
  
}