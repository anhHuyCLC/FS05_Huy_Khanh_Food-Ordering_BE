import models from "@models";

/**
 * Category names được map theo keywords của FE:
 *
 * slug "food"         → keywords: ["Món Việt", "Cơm", "Food", "Vietnamese", "Asian"]
 * slug "drinks"       → keywords: ["Drinks", "Beverage", "Juice", "Smoothie"]
 * slug "vegetarian"   → keywords: ["Chay", "Vegetarian", "Healthy", "Salad", "Vegan"]
 * slug "cake"         → keywords: ["Bánh", "Cake", "Bakery", "Pastry"]
 * slug "dessert"      → keywords: ["Dessert", "Tráng miệng", "Ice Cream", "Sweets", "Bakery"]
 * slug "pizza-burger" → keywords: ["Pizza", "Burger", "Fast Food", "American"]
 * slug "hotpot"       → keywords: ["Lẩu", "Hotpot", "BBQ", "Grill"]
 * slug "sushi"        → keywords: ["Sushi", "Japanese", "Asian", "Seafood"]
 * slug "pho"          → keywords: ["Pho", "Ramen", "Noodles", "Mì", "Vietnamese"]
 * slug "rice-box"     → keywords: ["Cơm", "Rice", "Món Việt", "Vietnamese"]
 * slug "fried-chicken"→ keywords: ["Chicken", "Gà", "Fried", "Fast Food"]
 * slug "milk-tea"     → keywords: ["Trà sữa", "Milk Tea", "Tea", "Boba", "Drinks"]
 * slug "coffee"       → keywords: ["Coffee", "Cafe", "Cà phê", "Brunch"]
 * slug "healthy"      → keywords: ["Healthy", "Salad", "Chay", "Vegetarian", "Clean"]
 * slug "fast-food"    → keywords: ["Fast Food", "Burger", "Chicken", "Pizza", "American"]
 */

// Map: restaurantName → danh sách category names (phải khớp keyword FE)
const restaurantCategoryMap: Record<string, string[]> = {
  "Mì Quảng Bà Mua": ["Món Việt", "Mì"],
  "Bánh Xèo Bà Dưỡng": ["Món Việt", "Bánh"],
  "Hải Sản Năm Rảnh": ["Seafood", "Lẩu", "Bia & Nước Ngọt"],
  "Cơm Tấm Sài Gòn": ["Cơm", "Chicken", "Combo"],
  "Bún Bò Bà Diệu": ["Mì", "Pho", "Noodles"],
  "Trà Sữa Gong Cha": ["Trà sữa", "Milk Tea", "Boba", "Tráng miệng"],
  "Highlands Coffee": ["Coffee", "Cà phê", "Bánh", "Drinks"],
  "Bánh Tráng Cuốn Thịt Heo Trần": ["Món Việt", "Vietnamese"],
  "Phở 29": ["Pho", "Noodles", "Vietnamese"],
  "Bánh Mì Phượng": ["Bánh", "Fast Food", "Burger"],
  "Domino's Pizza Đà Nẵng": ["Pizza", "Burger", "Fast Food", "American", "Combo"],
  "Lẩu Thái Mama": ["Lẩu", "Hotpot", "BBQ", "Seafood"],
  "Sakura Sushi": ["Sushi", "Japanese", "Seafood", "Asian"],
  "KFC Đà Nẵng": ["Chicken", "Gà", "Fried", "Fast Food", "Combo"],
  "Cơm Hộp Bà Năm": ["Cơm", "Rice", "Món Việt", "Vietnamese"],
  "Green Bite – Healthy Bowl": ["Healthy", "Salad", "Vegetarian", "Chay"],
};

const defaultCategories = ["Món Việt", "Drinks"];

export async function seedCategories() {
  console.log("🌱 Seeding categories...");

  const restaurants = await models.restaurant.findMany();

  for (const restaurant of restaurants) {
    const assignedCategories =
      restaurantCategoryMap[restaurant.name] || defaultCategories;

    for (let i = 0; i < assignedCategories.length; i++) {
      await models.category.create({
        data: {
          restaurantId: restaurant.id,
          name: assignedCategories[i],
          sortOrder: i + 1,
        },
      });
    }
  }

  console.log("✅ Categories seeded");
}