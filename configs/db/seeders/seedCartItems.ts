import models from "@models";

export async function seedCartItems() {
  console.log("🌱 Seeding cart items...");

  const carts = await models.cart.findMany();

  for (let i = 0; i < carts.length; i++) {
    const cart = carts[i];
    // Find a menu item belonging to this cart's restaurant
    const menuItem = await models.menuItem.findFirst({
      where: { restaurantId: cart.restaurantId, isAvailable: true }
    });

    if (menuItem) {
      await models.cartItem.create({
        data: {
          cartId: cart.id,
          menuItemId: menuItem.id,
          addedByUserId: cart.ownerId,
          quantity: i + 1,
          selectedOptions: {
            size: "Large",
            topping: "Cheese",
          },
          note: `Cart item note ${i}`,
        },
      });
    }
  }

  console.log("✅ Cart items seeded");
}