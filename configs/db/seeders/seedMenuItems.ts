import models from "@models";
import { Prisma } from "@prisma/client";

export async function seedMenuItems() {
  console.log("🌱 Seeding menu items...");

  const categories = await models.category.findMany({
    include: {
      restaurant: true,
    },
  });

  for (let i = 0; i < categories.length; i++) {
    for (let j = 1; j <= 10; j++) {
      await models.menuItem.create({
        data: {
          restaurantId: categories[i].restaurantId,
          categoryId: categories[i].id,
          name: `${categories[i].name} Item ${j}`,
          description: `Delicious ${categories[i].name}`,
          basePrice: new Prisma.Decimal(50000 + j * 10000),
          imageUrl: `https://picsum.photos/400/400?random=${i + j}`,
          isAvailable: true,
        },
      });
    }
  }

  console.log("✅ Menu items seeded");
}