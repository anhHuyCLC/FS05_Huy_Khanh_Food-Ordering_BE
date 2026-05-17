import models from "@models";

export async function seedMessages() {
  console.log("🌱 Seeding messages...");

  const conversations = await models.conversation.findMany();
  const profiles = await models.profile.findMany();

  for (const conversation of conversations) {
    for (let i = 1; i <= 10; i++) {
      await models.message.create({
        data: {
          conversationId: conversation.id,
          senderId: profiles[i % profiles.length].id,
          content: `Message ${i}`,
          type: "TEXT",
          isRead: true,
        },
      });
    }
  }

  console.log("✅ Messages seeded");
}