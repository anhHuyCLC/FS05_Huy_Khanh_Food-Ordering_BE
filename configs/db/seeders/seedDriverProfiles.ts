import models from "@models";
import { Prisma } from "@db";

export async function seedDriverProfiles() {
  console.log("🌱 Seeding driver profiles...");

  const profiles = await models.profile.findMany({
    take: 10,
  });

  for (let i = 0; i < profiles.length; i++) {
    await models.driverProfile.create({
      data: {
        id: profiles[i].id,
        vehicleInfo: `Honda Wave ${i}`,
        licensePlate: `43A1-12${i}45`,
        currentStatus: "online",
        walletBalance: new Prisma.Decimal(500000 + i * 100000),
        rating: new Prisma.Decimal(4.5),
      },
    });
  }

  console.log("✅ Driver profiles seeded");
}