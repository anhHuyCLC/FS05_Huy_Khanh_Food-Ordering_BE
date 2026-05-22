import models from "@models";
import { Prisma } from "@db";

export async function seedOrderItems() {
  console.log("🌱 Seeding order items...");

  const orders = await models.order.findMany();
  const menuItems = await models.menuItem.findMany();

  for (let i = 0; i < 10; i++) {
    await models.orderItem.create({
      data: {
        orderId: orders[i % orders.length].id,
        menuItemId: menuItems[i % menuItems.length].id,
        quantity: 2,
        unitPrice: new Prisma.Decimal(100000),
        selectedOptions: {
          size: "Medium",
        },
        note: `Order item ${i}`,
      },
    });
  }

  console.log("✅ Order items seeded");
}