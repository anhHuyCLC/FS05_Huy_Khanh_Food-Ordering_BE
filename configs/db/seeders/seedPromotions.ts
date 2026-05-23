import models from "@models";
import { Prisma } from "@db";

export async function seedPromotions() {
  console.log("🌱 Seeding promotions...");

  const restaurants = await models.restaurant.findMany();

  for (let i = 1; i <= 10; i++) {
    await models.promotion.create({
      data: {
        restaurantId: restaurants[i % restaurants.length].id,
        code: `SALE${i}`,
        description: `Discount ${i}`,
        discountPercentage: new Prisma.Decimal(10),
        minOrderValue: new Prisma.Decimal(100000),
        validFrom: new Date(),
        validTo: new Date("2027-12-31"),
        isActive: true,
      },
    });
  }

  console.log("✅ Promotions seeded");
}