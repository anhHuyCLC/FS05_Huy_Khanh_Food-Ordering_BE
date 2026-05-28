import models from "@models";
import { NotFoundError, UnauthorizedError } from "ts-rails";

export class RecommendationService {
  private static async resolveCustomerProfileId(userId: string) {
    if (!userId) {
      throw new UnauthorizedError("Cần đăng nhập để xem gợi ý combo");
    }

    let profile = await models.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      const user = await models.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      if (!user) {
        throw new NotFoundError("Người dùng không tìm thấy");
      }

      profile = await models.profile.create({
        data: {
          userId,
          fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        },
        select: { id: true },
      });
    }

    return profile.id;
  }

  private static isActivePromotion(promotion: any) {
    if (!promotion) return false;
    const now = new Date();
    const validFrom = new Date(promotion.validFrom);
    const validTo = new Date(promotion.validTo);

    return (
      promotion.isActive &&
      promotion.promotionType === "food" &&
      validFrom <= now &&
      validTo >= now
    );
  }

  private static calculateEffectivePrice(menuItem: any) {
    let effectivePrice = Number(menuItem.basePrice || 0);

    const promotions = (menuItem.appliedPromotions || []).filter((promotion: any) =>
      RecommendationService.isActivePromotion(promotion)
    );

    let bestDiscount = 0;
    for (const promotion of promotions) {
      if (promotion.discountPercentage) {
        const discount =
          (Number(promotion.discountPercentage) / 100) * effectivePrice;
        bestDiscount = Math.max(bestDiscount, discount);
      }
      if (promotion.fixedDiscount) {
        bestDiscount = Math.max(bestDiscount, Number(promotion.fixedDiscount));
      }
    }

    effectivePrice = Math.max(0, effectivePrice - bestDiscount);

    return {
      ...menuItem,
      effectivePrice: Number(effectivePrice.toFixed(2)),
      activePromotions: promotions,
      promotionDiscountAmount: Number(bestDiscount.toFixed(2)),
      categoryName: menuItem.category?.name ?? null,
    };
  }

  private static buildCombo(itemA: any, itemB: any, reason: string) {
    return {
      name: `Combo gợi ý: ${itemA.name} + ${itemB.name}`,
      reason,
      totalPrice: Number((itemA.effectivePrice + itemB.effectivePrice).toFixed(2)),
      items: [itemA, itemB].map((item) => ({
        id: item.id,
        name: item.name,
        category: item.categoryName,
        basePrice: Number(item.basePrice),
        effectivePrice: item.effectivePrice,
        imageUrl: item.imageUrl,
      })),
    };
  }

  static async getComboSuggestions(userId: string, restaurantId: string) {
    const customerId = await RecommendationService.resolveCustomerProfileId(userId);

    const restaurant = await models.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        menuItems: {
          where: { isAvailable: true },
          include: {
            category: true,
            appliedPromotions: true,
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundError("Nhà hàng không tìm thấy");
    }

    const completedOrders = await models.order.findMany({
      where: {
        customerId,
        restaurantId,
        status: "completed",
      },
      include: {
        orderItems: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                categoryId: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const menuItemMap = new Map(
      restaurant.menuItems.map((menuItem: any) => [
        menuItem.id,
        RecommendationService.calculateEffectivePrice(menuItem),
      ])
    );

    const purchaseCounts = new Map<string, number>();
    const pairCounts = new Map<string, Map<string, number>>();

    for (const order of completedOrders) {
      const itemIds = Array.from(
        new Set(
          order.orderItems
            .map((orderItem: any) => orderItem.menuItem?.id)
            .filter(Boolean)
        )
      );

      for (const itemId of itemIds) {
        purchaseCounts.set(itemId, (purchaseCounts.get(itemId) || 0) + 1);
      }

      for (let i = 0; i < itemIds.length; i++) {
        for (let j = i + 1; j < itemIds.length; j++) {
          const first = itemIds[i];
          const second = itemIds[j];

          if (!pairCounts.has(first)) {
            pairCounts.set(first, new Map());
          }
          if (!pairCounts.has(second)) {
            pairCounts.set(second, new Map());
          }

          pairCounts.get(first)!.set(
            second,
            (pairCounts.get(first)!.get(second) || 0) + 1
          );
          pairCounts.get(second)!.set(
            first,
            (pairCounts.get(second)!.get(first) || 0) + 1
          );
        }
      }
    }

    const orderedItemIds = Array.from(purchaseCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => id)
      .filter((id) => menuItemMap.has(id));

    const combos: any[] = [];
    for (const itemId of orderedItemIds) {
      if (combos.length >= 3) break;
      const itemA = menuItemMap.get(itemId);
      if (!itemA) continue;

      const relatedItems = Array.from(pairCounts.get(itemId)?.entries() || [])
        .sort(([, a], [, b]) => b - a)
        .map(([id]) => id)
        .filter((id) => id !== itemId && menuItemMap.has(id));

      const itemBId = relatedItems[0] || Array.from(menuItemMap.keys()).find((id) => id !== itemId);
      if (!itemBId) continue;

      const itemB = menuItemMap.get(itemBId);
      if (!itemB) continue;

      combos.push(
        RecommendationService.buildCombo(itemA, itemB, "Dựa trên lịch sử mua hàng")
      );
    }

    if (combos.length === 0) {
      const fallbackItems = Array.from(menuItemMap.values()).sort(
        (a: any, b: any) => Number(b.basePrice) - Number(a.basePrice)
      );

      for (let i = 0; i < Math.min(fallbackItems.length - 1, 3); i++) {
        combos.push(
          RecommendationService.buildCombo(
            fallbackItems[i],
            fallbackItems[i + 1],
            "Gợi ý combo phổ biến"
          )
        );
      }
    }

    return combos.slice(0, 3);
  }
}
