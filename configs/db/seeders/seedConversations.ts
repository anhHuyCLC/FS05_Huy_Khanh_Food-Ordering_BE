import models from "@models";

export async function seedConversation() {
  console.log("🌱 Seeding conversations...");

  const profiles = await models.profile.findMany({ take: 10 });

  for (let i = 0; i < 10; i++) {
    const conversation = await models.conversation.create({
      data: {
        isGroup: false,
        name: `Conversation ${i + 1}`,
        avatarUrl: `https://picsum.photos/300/300?random=${i + 1}`,
      },
    });

    await models.conversationParticipant.createMany({
      data: [
        {
          conversationId: conversation.id,
          profileId: profiles[0].id,
          isAdmin: true,
        },
        {
          conversationId: conversation.id,
          profileId: profiles[(i + 1) % profiles.length].id,
          isAdmin: false,
        },
      ],
      skipDuplicates: true,
    });
  }

  console.log("✅ Conversations seeded");
}