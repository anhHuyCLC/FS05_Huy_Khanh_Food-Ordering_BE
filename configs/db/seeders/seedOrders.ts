import models from "@models";
import { Prisma } from "@prisma/client";

export async function seedOrders() {
  console.log("🌱 Seeding orders...");

  const customers = await models.profile.findMany({ take: 10 });
  const restaurants = await models.restaurant.findMany();

  for (let i = 1; i <= 10; i++) {
    await models.order.create({
      data: {
        customerId: customers[i % customers.length].id,
        restaurantId: restaurants[i % restaurants.length].id,

        orderType: "standard_delivery",
        status: "completed",

        totalAmount: new Prisma.Decimal(200000),
        finalAmount: new Prisma.Decimal(180000),
        discountAmount: new Prisma.Decimal(20000),

        platformFee: new Prisma.Decimal(10000),
        restaurantNet: new Prisma.Decimal(170000),

        paymentStatus: "success",
        isPaid: true,

        deliveryAddress: `Address ${i}`,
        note: `Order note ${i}`,
      },
    });
  }
   console.log("✅ Orders seeded");
}