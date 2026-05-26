import models from "@models";
import { Prisma } from "@db";

export async function seedDriverProfiles() {
  console.log("🌱 Seeding driver profiles...");

  const driverUsers = await models.user.findMany({
    where: {
      roles: {
        some: {
          role: { code: "DRIVER" }
        }
      }
    },
    include: { profile: true }
  });

  for (let i = 0; i < driverUsers.length; i++) {
    const profile = driverUsers[i].profile;
    if (!profile) continue;

    await models.driverProfile.create({
      data: {
        id: profile.id,
        vehicleInfo: `Honda Wave ${i + 1}`,
        licensePlate: `43A1-12${i + 1}45`,
        currentStatus: "online",
        walletBalance: new Prisma.Decimal(500000 + i * 100000),
        rating: new Prisma.Decimal(4.5),
        approvalStatus: "APPROVED",
        commissionRate: new Prisma.Decimal(15.0),
        driverLicenseNumber: `DL-98765432${i}`,
        nationalIdNumber: `NID-12345678${i}`,
      },
    });
  }

  console.log("✅ Driver profiles seeded");
}