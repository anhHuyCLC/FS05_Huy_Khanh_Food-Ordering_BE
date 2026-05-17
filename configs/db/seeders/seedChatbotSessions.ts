import models from "@models";

export async function seedChatbotSessions() {
  console.log("🌱 Seeding chatbot sessions...");

  const profiles = await models.profile.findMany();

  for (let i = 0; i < 10; i++) {
    await models.chatbotSession.create({
      data: {
        userId: profiles[i % profiles.length].id,
        messages: [
          {
            role: "user",
            content: "Suggest me food",
          },
          {
            role: "model",
            content: "Try burger",
          },
        ],
      },
    });
  }

  console.log("✅ Chatbot sessions seeded");
}