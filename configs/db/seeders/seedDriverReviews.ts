
import models from "@models";
export async function seedDriverReviews() {
  console.log("🌱 Seeding driver reviews...");

  const customerProfiles = await models.profile.findMany({
    where: {
      user: {
        roles: {
          some: {
            role: { code: "CUSTOMER" }
          }
        }
      }
    }
  });

  const drivers = await models.driverProfile.findMany();

  for (let i = 0; i < customerProfiles.length; i++) {
    await models.driverReview.create({
      data: {
        reviewerId: customerProfiles[i].id,
        driverId: drivers[i % drivers.length].id,
        rating: 5,
        comment: `Driver review ${i + 1}`,
      },
    });
  }

  console.log("✅ Driver reviews seeded");
}