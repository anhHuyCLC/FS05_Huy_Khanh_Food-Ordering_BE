import models from "@models";

export async function seedProfiles() {
  console.log("🌱 Seeding profiles...");

  for (let i = 1; i <= 10; i++) {
    const user = await models.user.create({
      data: {
        firstName: `User${i}`,
        lastName: "Food",
        email: `user${i}@gmail.com`,
        status: "ACTIVE",
        avatarUrl: `https://i.pravatar.cc/300?img=${i}`,
        gender: i % 2 === 0 ? "male" : "female",
        phoneNumber: `090000000${i}`,
        address: `Da Nang ${i}`,
      },
    });

    await models.profile.create({
      data: {
        userId: user.id,
        fullName: `User ${i}`,
        phone: `090000000${i}`,
        avatarUrl: `https://i.pravatar.cc/300?img=${i}`,
        rewardPoints: i * 100,
        badgeLevel: i > 5 ? "Gold" : "Silver",
        deviceTokens: [`token_${i}`],
      },
    });
  }
  console.log("✅ Profiles seeded");
}  