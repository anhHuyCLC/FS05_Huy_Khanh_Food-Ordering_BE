import models from "@models";

export async function seedCategories() {
  console.log("🌱 Seeding categories...");

  const restaurants = await models.restaurant.findMany();

  const categories = [
    "Burger",
    "Pizza",
    "Chicken",
    "Drinks",
    "Coffee",
    "Sushi",
    "Ramen",
    "Dessert",
    "BBQ",
    "Fast Food",
  ];

  for (const restaurant of restaurants) {
    for (let i = 0; i < categories.length; i++) {
      await models.category.create({
        data: {
          restaurantId: restaurant.id,
          name: categories[i],
          sortOrder: i + 1,
        },
      });
    }
  }

  console.log("✅ Categories seeded");
}