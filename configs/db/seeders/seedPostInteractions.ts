import models from "@models";

export async function seedPostInteractions() {
  console.log("🌱 Seeding post interactions...");

  const posts = await models.socialPost.findMany();
  const profiles = await models.profile.findMany();

  for (let i = 0; i < 10; i++) {
    await models.postInteraction.create({
      data: {
        postId: posts[i % posts.length].id,
        userId: profiles[i % profiles.length].id,
        interactionType: "LIKE",
      },
    });
  }

  console.log("✅ Post interactions seeded");
}