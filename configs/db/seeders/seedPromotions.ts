import models from "@models";
import { Prisma } from "@db";

export async function seedPromotions() {
  console.log("🌱 Seeding promotions...");

  const restaurants = await models.restaurant.findMany();

  // Create standard/generic promotions
  for (let i = 1; i <= 10; i++) {
    await models.promotion.create({
      data: {
        restaurantId: restaurants[i % restaurants.length].id,
        code: `SALE${i}`,
        description: `Discount ${i}% for food items`,
        discountPercentage: new Prisma.Decimal(10),
        minOrderValue: new Prisma.Decimal(100000),
        validFrom: new Date(),
        validTo: new Date("2027-12-31"),
        isActive: true,
        promotionType: "food",
      },
    });
  }

  // Create explicit food discount promotions
  await models.promotion.create({
    data: {
      code: "FOOD10",
      description: "Giảm 10% tổng giá trị đồ ăn (Tối đa 50k)",
      discountPercentage: new Prisma.Decimal(10),
      minOrderValue: new Prisma.Decimal(80000),
      validFrom: new Date(),
      validTo: new Date("2027-12-31"),
      isActive: true,
      promotionType: "food",
    }
  });

  await models.promotion.create({
    data: {
      code: "FOOD50K",
      description: "Giảm ngay 50.000đ cho hóa đơn đồ ăn từ 200k",
      fixedDiscount: new Prisma.Decimal(50000),
      minOrderValue: new Prisma.Decimal(200000),
      validFrom: new Date(),
      validTo: new Date("2027-12-31"),
      isActive: true,
      promotionType: "food",
    }
  });

  // Create explicit shipping fee discount promotions
  await models.promotion.create({
    data: {
      code: "FREESHIP",
      description: "Miễn phí vận chuyển cho đơn hàng từ 100k",
      discountPercentage: new Prisma.Decimal(100),
      minOrderValue: new Prisma.Decimal(100000),
      validFrom: new Date(),
      validTo: new Date("2027-12-31"),
      isActive: true,
      promotionType: "shipping",
    }
  });

  await models.promotion.create({
    data: {
      code: "SHIP15K",
      description: "Giảm 15.000đ phí vận chuyển cho đơn hàng từ 50k",
      fixedDiscount: new Prisma.Decimal(15000),
      minOrderValue: new Prisma.Decimal(50000),
      validFrom: new Date(),
      validTo: new Date("2027-12-31"),
      isActive: true,
      promotionType: "shipping",
    }
  });

  console.log("✅ Promotions seeded");
}