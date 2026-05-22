import models from "@models";
import { Prisma } from "@db";

export async function seedWalletTransactions() {
  console.log("🌱 Seeding wallet transactions...");

  const drivers = await models.driverProfile.findMany();

  for (let i = 0; i < 10; i++) {
    await models.walletTransaction.create({
      data: {
        driverId: drivers[i % drivers.length].id,
        amount: new Prisma.Decimal(50000),
        transactionType: "earning",
        description: `Transaction ${i}`,
      },
    });
  }

  console.log("✅ Wallet transactions seeded");
}