import models from "@models";
import { Prisma } from "@prisma/client";

export async function seedRestaurants() {
  console.log("🌱 Seeding restaurants...");

  const owners = await models.profile.findMany({
    take: 5,
  });

  for (let i = 1; i <= 10; i++) {
    await models.restaurant.create({
      data: {
        ownerId: owners[i % owners.length].id,
        name: `Restaurant ${i}`,
        description: `Best food restaurant ${i}`,
        address: `Street ${i}, Da Nang`,
        latitude: new Prisma.Decimal(16.05 + i / 1000),
        longitude: new Prisma.Decimal(108.22 + i / 1000),
        isActive: true,
        rating: new Prisma.Decimal(4.5),
      },
    });
  }

  console.log("✅ Restaurants seeded");
}