import models from "@models";

export async function seedRestaurantReview() {
  console.log("🌱 Seeding reviews...");

  const profiles = await models.profile.findMany();
  const restaurants = await models.restaurant.findMany();

  for (let i = 1; i <= 10; i++) {
    await models.restaurantReview.create({
      data: {
        reviewerId: profiles[i % profiles.length].id,
        restaurantId: restaurants[i % restaurants.length].id,
        rating: 5,
        comment: `Very good restaurant ${i}`,
        replyFromOwner: `Thank you ${i}`,
      },
    });
  }

  console.log("✅ Reviews seeded");
}