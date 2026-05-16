import models from "@models";

export async function seedCartItems() {
  console.log("🌱 Seeding cart items...");

  const carts = await models.cart.findMany();
  const menuItems = await models.menuItem.findMany();
  const profiles = await models.profile.findMany();

  for (let i = 0; i < 10; i++) {
    await models.cartItem.create({
      data: {
        cartId: carts[i % carts.length].id,
        menuItemId: menuItems[i % menuItems.length].id,
        addedByUserId: profiles[i % profiles.length].id,
        quantity: i + 1,
        selectedOptions: {
          size: "Large",
          topping: "Cheese",
        },
        note: `Cart item note ${i}`,
      },
    });
  }

  console.log("✅ Cart items seeded");
}