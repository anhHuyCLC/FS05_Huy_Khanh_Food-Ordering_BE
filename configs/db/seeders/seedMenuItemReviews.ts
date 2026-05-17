import models from "@models";

export async function seedMenuItemReviews() {
  console.log("🌱 Seeding menu item reviews...");

  const profiles = await models.profile.findMany();
  const menuItems = await models.menuItem.findMany();

  for (let i = 0; i < 10; i++) {
    await models.menuItemReview.create({
      data: {
        reviewerId: profiles[i % profiles.length].id,
        menuItemId: menuItems[i % menuItems.length].id,
        rating: 5,
        comment: `Menu item review ${i}`,
      },
    });
  }

  console.log("✅ Menu item reviews seeded");
}