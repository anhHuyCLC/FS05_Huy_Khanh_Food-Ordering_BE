import models from "@models";

export async function seedCategories() {
  console.log("🌱 Seeding categories...");

  const restaurants = await models.restaurant.findMany();

  const restaurantCategoryMap: Record<string, string[]> = {
    "Mì Quảng Bà Mua": ["Mì Quảng", "Đặc Sản Đà Nẵng", "Nước Giải Khát"],
    "Bánh Xèo Bà Dưỡng": ["Bánh Xèo - Nem Lụi", "Đồ Uống"],
    "Hải Sản Năm Rảnh": ["Hải Sản Tươi Sống", "Lẩu", "Bia & Nước Ngọt"],
    "Cơm Tấm Sài Gòn": ["Cơm Tấm", "Canh & Đồ Thêm", "Nước Giải Khát"],
    "Bún Bò Bà Diệu": ["Bún Bò Huế", "Đồ Uống"],
    "Trà Sữa Gong Cha": ["Trà Sữa", "Trà Trái Cây", "Topping"],
    "Highlands Coffee": ["Cà Phê Truyền Thống", "Trà", "Bánh Mì & Ngọt"],
    "Bánh Tráng Cuốn Thịt Heo Trần": ["Món Cuốn", "Mì Quảng", "Đồ Uống"],
    "Phở 29": ["Phở bò", "Cơm Rang", "Đồ Uống"],
    "Bánh Mì Phượng": ["Bánh Mì Thịt", "Đồ Uống"],
  };

  const genericCategories = ["Món Chính", "Đồ Uống"];

  for (const restaurant of restaurants) {
    const assignedCategories = restaurantCategoryMap[restaurant.name] || genericCategories;
    
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