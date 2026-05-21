import models from "@models";

export interface MenuItemContext {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  category: string | null;
  isAvailable: boolean;
  avgRating: number | null;
  reviewCount: number;
}

export interface RestaurantContext {
  id: string;
  name: string;
  description: string | null;
  address: string;
  rating: number | null;
  menuItems: MenuItemContext[];
}

export interface ChatContextData {
  restaurants: RestaurantContext[];
  topRatedItems: MenuItemContext[];
  totalRestaurants: number;
  totalMenuItems: number;
}

export class ChatContextService {
  /**
   * Lấy toàn bộ context cần thiết từ DB để inject vào system prompt.
   * Chỉ lấy các nhà hàng đang hoạt động và các món đang có sẵn.
   */
  async getContext(): Promise<ChatContextData> {
    // Lấy danh sách nhà hàng đang hoạt động kèm menu
    const restaurants = await models.restaurant.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        rating: true,
        menuItems: {
          where: { isAvailable: true },
          select: {
            id: true,
            name: true,
            description: true,
            basePrice: true,
            category: { select: { name: true } },
            reviews: {
              select: { rating: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50, // Giới hạn để tránh quá tải prompt
        },
      },
      orderBy: { rating: "desc" },
    });

    type RestaurantRow = (typeof restaurants)[number];
    type MenuItemRow = RestaurantRow["menuItems"][number];

    // Format dữ liệu nhà hàng
    const formattedRestaurants: RestaurantContext[] = restaurants.map((r: RestaurantRow) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      address: r.address,
      rating: r.rating ? Number(r.rating) : null,
      menuItems: r.menuItems.map((item: MenuItemRow) => {
        const reviews = item.reviews as { rating: number }[];
        const avgRating =
          reviews.length > 0
            ? reviews.reduce((sum, rv) => sum + rv.rating, 0) / reviews.length
            : null;
        return {
          id: item.id,
          name: item.name,
          description: item.description,
          basePrice: Number(item.basePrice),
          category: item.category?.name ?? null,
          isAvailable: true,
          avgRating: avgRating !== null ? Math.round(avgRating * 10) / 10 : null,
          reviewCount: reviews.length,
        };
      }),
    }));

    // Lấy top 10 món được đánh giá cao nhất (có ít nhất 1 review)
    const allItems = formattedRestaurants.flatMap((r) =>
      r.menuItems
        .filter((item) => item.avgRating !== null && item.reviewCount > 0)
        .map((item) => ({
          ...item,
          restaurantName: r.name,
        }))
    );

    const topRatedItems = allItems
      .sort((a, b) => {
        const ratingDiff = (b.avgRating ?? 0) - (a.avgRating ?? 0);
        if (ratingDiff !== 0) return ratingDiff;
        return b.reviewCount - a.reviewCount;
      })
      .slice(0, 10);

    const totalMenuItems = formattedRestaurants.reduce(
      (sum, r) => sum + r.menuItems.length,
      0
    );

    return {
      restaurants: formattedRestaurants,
      topRatedItems,
      totalRestaurants: formattedRestaurants.length,
      totalMenuItems,
    };
  }

  /**
   * Format dữ liệu thành chuỗi văn bản để inject vào system prompt.
   */
  formatContextForPrompt(ctx: ChatContextData): string {
    if (ctx.totalRestaurants === 0) {
      return "Hiện tại chưa có nhà hàng nào đang hoạt động trong hệ thống.";
    }

    const lines: string[] = [];

    lines.push(`=== DỮ LIỆU THỰC TẾ TỪ HỆ THỐNG (${new Date().toLocaleDateString("vi-VN")}) ===`);
    lines.push(`Tổng số nhà hàng đang hoạt động: ${ctx.totalRestaurants}`);
    lines.push(`Tổng số món ăn có sẵn: ${ctx.totalMenuItems}`);
    lines.push("");

    // Top món được đánh giá cao
    if (ctx.topRatedItems.length > 0) {
      lines.push("--- TOP MÓN ĐƯỢC ĐÁNH GIÁ CAO NHẤT ---");
      ctx.topRatedItems.forEach((item, i) => {
        const ratingStr = item.avgRating !== null ? `⭐ ${item.avgRating}/5 (${item.reviewCount} đánh giá)` : "";
        lines.push(
          `${i + 1}. ${item.name} - ${formatPrice(item.basePrice)} ${ratingStr}`
        );
        if (item.description) {
          lines.push(`   Mô tả: ${item.description}`);
        }
      });
      lines.push("");
    }

    // Danh sách nhà hàng và menu
    lines.push("--- DANH SÁCH NHÀ HÀNG VÀ MENU ---");
    ctx.restaurants.forEach((restaurant) => {
      const ratingStr = restaurant.rating ? ` | Rating: ⭐ ${restaurant.rating}/5` : "";
      lines.push(`\n🏪 ${restaurant.name}${ratingStr}`);
      lines.push(`   Địa chỉ: ${restaurant.address}`);
      if (restaurant.description) {
        lines.push(`   Mô tả: ${restaurant.description}`);
      }

      if (restaurant.menuItems.length === 0) {
        lines.push("   (Chưa có món ăn nào)");
      } else {
        lines.push(`   Menu (${restaurant.menuItems.length} món):`);

        // Nhóm theo category
        const byCategory: Record<string, MenuItemContext[]> = {};
        restaurant.menuItems.forEach((item) => {
          const cat = item.category ?? "Khác";
          if (!byCategory[cat]) byCategory[cat] = [];
          byCategory[cat].push(item);
        });

        Object.entries(byCategory).forEach(([cat, items]) => {
          lines.push(`   [${cat}]`);
          items.forEach((item) => {
            const reviewStr =
              item.avgRating !== null
                ? ` ⭐${item.avgRating} (${item.reviewCount} đánh giá)`
                : "";
            lines.push(`   • ${item.name} - ${formatPrice(item.basePrice)}${reviewStr}`);
            if (item.description) {
              lines.push(`     ${item.description}`);
            }
          });
        });
      }
    });

    return lines.join("\n");
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}
