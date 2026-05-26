import models from "@models";
import { Prisma } from "@db";

export async function seedOrders() {
  console.log("🌱 Seeding orders...");

  const customerProfiles = await models.profile.findMany({
    where: {
      user: {
        roles: {
          some: {
            role: { code: "CUSTOMER" }
          }
        }
      }
    }
  });

  const driverProfiles = await models.driverProfile.findMany();
  const restaurants = await models.restaurant.findMany();

  const daNangAddresses = [
    "K44/21 Nguyễn Chánh, Liên Chiểu, Đà Nẵng",
    "120 Lương Nhữ Hộc, Cẩm Lệ, Đà Nẵng",
    "85 Núi Thành, Hải Châu, Đà Nẵng",
  ];

  for (let i = 1; i <= 6; i++) {
    const address = daNangAddresses[(i - 1) % daNangAddresses.length];
    const customer = customerProfiles[i % customerProfiles.length];
    const restaurant = restaurants[i % restaurants.length];
    const driver = driverProfiles[i % driverProfiles.length];

    await models.order.create({
      data: {
        customerId: customer.id,
        restaurantId: restaurant.id,
        driverId: driver ? driver.id : null,

        orderType: "standard_delivery",
        status: "completed",

        totalAmount: new Prisma.Decimal(200000),
        finalAmount: new Prisma.Decimal(180000),
        discountAmount: new Prisma.Decimal(20000),

        platformFee: new Prisma.Decimal(10000),
        restaurantNet: new Prisma.Decimal(170000),

        paymentStatus: "success",
        isPaid: true,

        deliveryAddress: address,
        note: `Giao hàng tại ${address}`,
      },
    });
  }
  console.log("✅ Orders seeded");
}