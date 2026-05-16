import models from "@models";
import { Prisma } from "@prisma/client";

export async function seedOptionChoices() {
  console.log("🌱 Seeding option choices...");

  const groups = await models.optionGroup.findMany();

  for (const group of groups) {
    await models.optionChoice.createMany({
      data: [
        {
          optionGroupId: group.id,
          name: "Small",
          additionalPrice: new Prisma.Decimal(0),
        },
        {
          optionGroupId: group.id,
          name: "Medium",
          additionalPrice: new Prisma.Decimal(10000),
        },
        {
          optionGroupId: group.id,
          name: "Large",
          additionalPrice: new Prisma.Decimal(20000),
        },
      ],
    });
  }
console.log("✅ Option choices seeded");
}