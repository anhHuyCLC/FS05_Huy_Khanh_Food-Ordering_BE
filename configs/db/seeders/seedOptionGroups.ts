import models from "@models";

export async function seedOptionGroups() {
  console.log("🌱 Seeding option groups...");

  const menuItems = await models.menuItem.findMany({
    take: 10,
  });

  for (const item of menuItems) {
    await models.optionGroup.create({
      data: {
        menuItemId: item.id,
        name: "Choose Size",
        isRequired: true,
        maxChoices: 1,
      },
    });

    await models.optionGroup.create({
      data: {
        menuItemId: item.id,
        name: "Extra Toppings",
        isRequired: false,
        maxChoices: 3,
      },
    });
  }

  console.log("✅ Option groups seeded");
}