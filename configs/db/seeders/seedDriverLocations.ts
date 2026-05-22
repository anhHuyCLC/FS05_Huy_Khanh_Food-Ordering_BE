import models from "@models";
import { Prisma } from "@db";

export async function seedDriverLocations() {
  console.log("🌱 Seeding driver locations...");

  const drivers = await models.driverProfile.findMany();

  // Da Nang boundaries approx: 16.03 to 16.08 lat, 108.18 to 108.24 lng
  for (let i = 0; i < drivers.length; i++) {
    const lat = 16.03 + (Math.random() * 0.05);
    const lng = 108.18 + (Math.random() * 0.06);
    await models.driverLocation.create({
      data: {
        driverId: drivers[i].id,
        latitude: new Prisma.Decimal(lat.toFixed(6)),
        longitude: new Prisma.Decimal(lng.toFixed(6)),
      },
    });
  }

  console.log("✅ Driver locations seeded");
}