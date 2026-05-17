import models from "@models";

export async function seedOrderStatusHistories() {
  console.log("🌱 Seeding order status histories...");

  const orders = await models.order.findMany();

  const statuses = [
    "pending",
    "accepted",
    "preparing",
    "delivering",
    "completed",
  ];

  for (const order of orders) {
    for (const status of statuses) {
      await models.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: status as any,
          note: `${status} status`,
        },
      });
    }
  }

  console.log("✅ Order status histories seeded");
}