import models from "@models";
import { Prisma } from "@prisma/client";

export async function seedDriverLocations() {
  console.log("🌱 Seeding driver locations...");

  const drivers = await models.driverProfile.findMany();

  for (let i = 0; i < drivers.length; i++) {
    await models.driverLocation.create({
      data: {
        driverId: drivers[i].id,
        latitude: new Prisma.Decimal(16.047 + i / 1000),
        longitude: new Prisma.Decimal(108.206 + i / 1000),
      },
    });
  }

  console.log("✅ Driver locations seeded");
}