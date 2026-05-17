import models from "@models";

export async function seedCarts() {
  console.log("🌱 Seeding carts...");

  const profiles = await models.profile.findMany();
  const restaurants = await models.restaurant.findMany();

  for (let i = 0; i < 10; i++) {
    await models.cart.create({
      data: {
        ownerId: profiles[i % profiles.length].id,
        restaurantId: restaurants[i % restaurants.length].id,
        isGroupCart: i % 2 === 0,
        sessionToken: `SESSION_${i}`,
      },
    });
  }

  console.log("✅ Carts seeded");
}