import models from "@models";
import { Prisma } from "@db";

export async function seedOrders() {
  console.log("🌱 Seeding orders...");

  const customers = await models.profile.findMany({ take: 10 });
  const restaurants = await models.restaurant.findMany();

  const daNangAddresses = [
    "K44/21 Nguyễn Chánh, Liên Chiểu, Đà Nẵng",
    "120 Lương Nhữ Hộc, Cẩm Lệ, Đà Nẵng",
    "85 Núi Thành, Hải Châu, Đà Nẵng",
    "202 Đống Đa, Hải Châu, Đà Nẵng",
    "15 Tôn Quang Phiệt, Sơn Trà, Đà Nẵng",
    "400 Điện Biên Phủ, Thanh Khê, Đà Nẵng",
    "30 Lý Thái Tổ, Thanh Khê, Đà Nẵng",
    "12 Nguyễn Hữu Thọ, Hải Châu, Đà Nẵng",
    "50 Lê Thanh Nghị, Hải Châu, Đà Nẵng",
    "88 Ngô Quyền, Sơn Trà, Đà Nẵng",
  ];

  for (let i = 1; i <= 10; i++) {
    const address = daNangAddresses[(i - 1) % daNangAddresses.length];
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

        deliveryAddress: address,
        note: `Giao hàng tại ${address}`,
      },
    });
  }
   console.log("✅ Orders seeded");
}