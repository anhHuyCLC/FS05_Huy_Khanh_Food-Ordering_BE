import models from "@models";

export async function seedDriverReviews() {
  console.log("🌱 Seeding driver reviews...");

  const profiles = await models.profile.findMany();
  const drivers = await models.driverProfile.findMany();

  for (let i = 0; i < 10; i++) {
    await models.driverReview.create({
      data: {
        reviewerId: profiles[i % profiles.length].id,
        driverId: drivers[i % drivers.length].id,
        rating: 5,
        comment: `Driver review ${i}`,
      },
    });
  }

  console.log("✅ Driver reviews seeded");
}