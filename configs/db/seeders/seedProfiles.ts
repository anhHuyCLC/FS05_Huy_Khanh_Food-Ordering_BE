import models from "@models";

export async function seedProfiles() {
  console.log("🌱 Seeding profiles...");

  const daNangAddresses = [
    "123 Lê Duẩn, Hải Châu, Đà Nẵng",
    "45 Nguyễn Văn Linh, Hải Châu, Đà Nẵng",
    "67 Phạm Văn Đồng, Sơn Trà, Đà Nẵng",
    "89 Trần Phú, Hải Châu, Đà Nẵng",
    "101 Võ Nguyên Giáp, Sơn Trà, Đà Nẵng",
    "234 Điện Biên Phủ, Thanh Khê, Đà Nẵng",
    "56 Hùng Vương, Hải Châu, Đà Nẵng",
    "78 Tôn Đức Thắng, Liên Chiểu, Đà Nẵng",
    "90 Nguyễn Tri Phương, Hải Châu, Đà Nẵng",
    "112 Hoàng Diệu, Hải Châu, Đà Nẵng",
  ];

  const firstNames = ["Huy", "Nam", "Mai", "Lan", "Hải", "Sơn", "Hoa", "Tuấn", "Linh", "Minh"];
  const lastNames = ["Trần", "Nguyễn", "Lê", "Phạm", "Hoàng", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ"];

  for (let i = 1; i <= 10; i++) {
    const firstName = firstNames[i % 10];
    const lastName = lastNames[i % 10];
    const address = daNangAddresses[(i - 1) % 10];

    const user = await models.user.create({
      data: {
        firstName: firstName,
        lastName: lastName,
        email: `user${i}@gmail.com`,
        status: "ACTIVE",
        avatarUrl: `https://i.pravatar.cc/300?img=${i}`,
        gender: i % 2 === 0 ? "male" : "female",
        phoneNumber: `090000000${i}`,
        address: address,
      },
    });

    await models.profile.create({
      data: {
        userId: user.id,
        fullName: `${lastName} ${firstName}`,
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