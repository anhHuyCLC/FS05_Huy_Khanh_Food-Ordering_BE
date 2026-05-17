import models from "@models";

export async function seedSocialPosts() {
  console.log("🌱 Seeding social posts...");

  const profiles = await models.profile.findMany();
  const restaurants = await models.restaurant.findMany();

  for (let i = 0; i < 10; i++) {
    await models.socialPost.create({
      data: {
        userId: profiles[i % profiles.length].id,
        restaurantId: restaurants[i % restaurants.length].id,
        content: `Amazing food ${i}`,
        mediaUrls: [
          `https://picsum.photos/500/500?random=${i}`,
        ],
        taggedItems: [],
        likesCount: 100 + i,
        commentsCount: 20 + i,
      },
    });
  }

  console.log("✅ Social posts seeded");
}