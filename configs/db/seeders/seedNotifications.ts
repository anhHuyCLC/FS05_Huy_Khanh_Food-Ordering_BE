import models from "@models";

export async function seedNotifications() {
  console.log("🌱 Seeding notifications...");

  const profiles = await models.profile.findMany();

  for (let i = 1; i <= 10; i++) {
    await models.notification.create({
      data: {
        receiverId: profiles[i % profiles.length].id,
        title: `Notification ${i}`,
        content: `Content ${i}`,
        type: "ORDER",
        isRead: i % 2 === 0,
      },
    });
  }

  console.log("✅ Notifications seeded");
}