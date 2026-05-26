import models from "@models";

export async function seedCarts() {
  console.log("🌱 Seeding carts...");

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
    await models.cart.create({
      data: {
        ownerId: customerProfiles[i].id,
        restaurantId: restaurants[i % restaurants.length].id,
        isGroupCart: i % 2 === 0,
        sessionToken: `SESSION_${i}`,
      },
    });
  }

  console.log("✅ Carts seeded");
}