import models from "@models";

export async function seedRestaurantReview() {
  console.log("🌱 Seeding reviews...");

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

  const restaurants = await models.restaurant.findMany();

  for (let i = 0; i < customerProfiles.length; i++) {
    await models.restaurantReview.create({
      data: {
        reviewerId: customerProfiles[i].id,
        restaurantId: restaurants[i % restaurants.length].id,
        rating: 5,
        comment: `Very good restaurant ${i + 1}`,
        replyFromOwner: `Thank you ${i + 1}`,
      },
    });
  }

  console.log("✅ Reviews seeded");
}