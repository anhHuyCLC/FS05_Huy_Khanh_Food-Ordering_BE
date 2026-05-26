import models from "@models";
import { Prisma } from "@db";

export async function seedOrderItems() {
  console.log("🌱 Seeding order items...");

  const orders = await models.order.findMany();

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const menuItem = await models.menuItem.findFirst({
      where: { restaurantId: order.restaurantId }
    });

    if (menuItem) {
      await models.orderItem.create({
        data: {
          orderId: order.id,
          menuItemId: menuItem.id,
          quantity: 2,
          unitPrice: menuItem.basePrice,
          selectedOptions: {
            size: "Medium",
          },
          note: `Order item for order ${i + 1}`,
        },
      });
    }
  }

  console.log("✅ Order items seeded");
}