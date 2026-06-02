import models from "@models";

export async function seedFavorites() {
  console.log("🌱 Seeding favorite restaurants...");

  const profiles = await models.profile.findMany({
    select: { id: true }
  });

  const restaurants = await models.restaurant.findMany({
    select: { id: true }
  });

  if (profiles.length === 0 || restaurants.length === 0) {
    console.log("⚠️ No profiles or restaurants found. Skipping favorites seeding.");
    return;
  }

  // Seed favorites for each profile
  for (const profile of profiles) {
    // Randomly select 2 to 4 restaurants to favorite
    const numFavorites = Math.floor(Math.random() * 3) + 2; // 2, 3 or 4
    const shuffled = [...restaurants].sort(() => 0.5 - Math.random());
    const selectedRestaurants = shuffled.slice(0, numFavorites);

    for (const restaurant of selectedRestaurants) {
      await models.favoriteRestaurant.upsert({
        where: {
          profileId_restaurantId: {
            profileId: profile.id,
            restaurantId: restaurant.id,
          },
        },
        update: {},
        create: {
          profileId: profile.id,
          restaurantId: restaurant.id,
        },
      });
    }
  }

  console.log("✅ Favorite restaurants seeded");
}
