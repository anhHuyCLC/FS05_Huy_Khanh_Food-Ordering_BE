import models from "@models";
import { Prisma } from "@prisma/client";

export async function seedPayments() {
  console.log("🌱 Seeding payments...");

  const orders = await models.order.findMany();

  for (let i = 0; i < orders.length; i++) {
    await models.payment.create({
      data: {
        orderId: orders[i].id,
        method: "e_wallet",
        provider: "momo",
        status: "success",
        amount: new Prisma.Decimal(180000),
        currency: "VND",
        transactionId: `TXN_${i}`,
        paymentCode: `PAY_${i}`,
        providerOrderId: `MOMO_${i}`,
      },
    });
  }

  console.log("✅ Payments seeded");
}