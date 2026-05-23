import models from "@models";
import { Prisma } from "@db";

export async function seedOptionGroups() {
  console.log("🌱 Seeding option groups and choices...");

  const menuItems = await models.menuItem.findMany({
    include: {
      category: true,
    },
  });

  for (const item of menuItems) {
    const categoryName = item.category?.name || "";
    const name = item.name.toLowerCase();
    const catNameLower = categoryName.toLowerCase();

    // 10. Topping & Side category: no options
    if (
      catNameLower.includes("topping") ||
      catNameLower.includes("canh & đồ thêm") ||
      name.includes("thêm sườn")
    ) {
      continue;
    }

    // 1. Packaged Drinks (Lon/Chai: Pepsi, Coca, Nước Suối, Nước Khoáng, Bia)
    if (
      name.includes("pepsi") ||
      name.includes("coca") ||
      name.includes("nước suối") ||
      name.includes("nước khoáng") ||
      name.includes("dasani") ||
      name.includes("aquafina") ||
      name.includes("bia") ||
      name.includes("heineken") ||
      name.includes("tiger")
    ) {
      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Cách phục vụ",
          isRequired: true,
          maxChoices: 1,
          choices: {
            create: [
              { name: "Ướp lạnh sẵn", additionalPrice: new Prisma.Decimal(0) },
              { name: "Dùng kèm ly đá", additionalPrice: new Prisma.Decimal(0) },
              { name: "Nhiệt độ thường (Không lạnh)", additionalPrice: new Prisma.Decimal(0) },
            ],
          },
        },
      });
      continue;
    }

    // 2. Fresh Simple Beverages (Fresh milk, juice etc: Sữa Bắp, Sữa Đậu Nành)
    if (name.includes("sữa bắp") || name.includes("sữa đậu nành")) {
      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Nhiệt độ",
          isRequired: true,
          maxChoices: 1,
          choices: {
            create: [
              { name: "Uống lạnh (Thêm đá)", additionalPrice: new Prisma.Decimal(0) },
              { name: "Uống nóng", additionalPrice: new Prisma.Decimal(0) },
              { name: "Không đá (Ướp lạnh sẵn)", additionalPrice: new Prisma.Decimal(0) },
            ],
          },
        },
      });

      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Lượng đường",
          isRequired: true,
          maxChoices: 1,
          choices: {
            create: [
              { name: "Ngọt vừa (Mặc định)", additionalPrice: new Prisma.Decimal(0) },
              { name: "Ít ngọt", additionalPrice: new Prisma.Decimal(0) },
              { name: "Không đường", additionalPrice: new Prisma.Decimal(0) },
            ],
          },
        },
      });
      continue;
    }

    // 3. Plain Tea / Trà Đá
    if (name.includes("trà đá")) {
      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Lượng đá",
          isRequired: true,
          maxChoices: 1,
          choices: {
            create: [
              { name: "Nhiều đá", additionalPrice: new Prisma.Decimal(0) },
              { name: "Ít đá", additionalPrice: new Prisma.Decimal(0) },
              { name: "Không đá", additionalPrice: new Prisma.Decimal(0) },
            ],
          },
        },
      });
      continue;
    }

    // 4. Premium Hand-crafted Drinks (Trà sữa, Trà trái cây, Cà phê truyền thống, Trà)
    if (
      catNameLower.includes("trà sữa") ||
      catNameLower.includes("trà trái cây") ||
      catNameLower.includes("cà phê truyền thống") ||
      (catNameLower.includes("trà") && !name.includes("đá"))
    ) {
      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Kích cỡ (Size)",
          isRequired: true,
          maxChoices: 1,
          choices: {
            create: [
              { name: "Size M", additionalPrice: new Prisma.Decimal(0) },
              { name: "Size L", additionalPrice: new Prisma.Decimal(10000) },
            ],
          },
        },
      });

      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Lượng Đá",
          isRequired: true,
          maxChoices: 1,
          choices: {
            create: [
              { name: "100% Đá", additionalPrice: new Prisma.Decimal(0) },
              { name: "50% Đá", additionalPrice: new Prisma.Decimal(0) },
              { name: "Không Đá", additionalPrice: new Prisma.Decimal(0) },
            ],
          },
        },
      });

      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Lượng Đường",
          isRequired: true,
          maxChoices: 1,
          choices: {
            create: [
              { name: "100% Đường", additionalPrice: new Prisma.Decimal(0) },
              { name: "50% Đường", additionalPrice: new Prisma.Decimal(0) },
              { name: "0% Đường (Không ngọt)", additionalPrice: new Prisma.Decimal(0) },
            ],
          },
        },
      });

      // Thêm toppings cho trà sữa & trà trái cây/trà thạch
      if (catNameLower.includes("trà sữa") || catNameLower.includes("trà") || name.includes("hồng trà")) {
        await models.optionGroup.create({
          data: {
            menuItemId: item.id,
            name: "Topping thêm",
            isRequired: false,
            maxChoices: 3,
            choices: {
              create: [
                { name: "Trân châu đen", additionalPrice: new Prisma.Decimal(5000) },
                { name: "Trân châu trắng", additionalPrice: new Prisma.Decimal(8000) },
                { name: "Kem Macchiato", additionalPrice: new Prisma.Decimal(10000) },
                { name: "Thạch phô mai", additionalPrice: new Prisma.Decimal(10000) },
              ],
            },
          },
        });
      }
      continue;
    }

    // 5. Noodle Soups (Mì Quảng, Phở bò, Bún Bò Huế, etc.)
    if (
      catNameLower.includes("mì quảng") ||
      catNameLower.includes("bún bò huế") ||
      catNameLower.includes("phở bò") ||
      name.includes("bún bò") ||
      name.includes("phở") ||
      name.includes("mì quảng")
    ) {
      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Kích cỡ",
          isRequired: true,
          maxChoices: 1,
          choices: {
            create: [
              { name: "Tô thường", additionalPrice: new Prisma.Decimal(0) },
              { name: "Tô lớn", additionalPrice: new Prisma.Decimal(10000) },
              { name: "Tô đặc biệt (Nhiều thịt & chả)", additionalPrice: new Prisma.Decimal(20000) },
            ],
          },
        },
      });

      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Topping thêm",
          isRequired: false,
          maxChoices: 4,
          choices: {
            create: [
              { name: "Thêm quẩy giòn (1 dĩa)", additionalPrice: new Prisma.Decimal(5000) },
              { name: "Thêm trứng chần", additionalPrice: new Prisma.Decimal(5000) },
              { name: "Thêm thịt", additionalPrice: new Prisma.Decimal(15000) },
              { name: "Thêm chả cua / giò", additionalPrice: new Prisma.Decimal(10000) },
            ],
          },
        },
      });

      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Yêu cầu hành / rau",
          isRequired: false,
          maxChoices: 3,
          choices: {
            create: [
              { name: "Không hành lá", additionalPrice: new Prisma.Decimal(0) },
              { name: "Nhiều hành lá", additionalPrice: new Prisma.Decimal(0) },
              { name: "Không lấy rau sống", additionalPrice: new Prisma.Decimal(0) },
              { name: "Nước dùng ít mỡ béo", additionalPrice: new Prisma.Decimal(0) },
            ],
          },
        },
      });
      continue;
    }

    // 6. Dry Noodle Bowls (Bún Thịt Nướng, Bún Mắm Nêm)
    if (name.includes("bún thịt nướng") || name.includes("bún mắm nêm")) {
      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Kích cỡ",
          isRequired: true,
          maxChoices: 1,
          choices: {
            create: [
              { name: "Tô thường", additionalPrice: new Prisma.Decimal(0) },
              { name: "Tô đặc biệt (Thêm thịt)", additionalPrice: new Prisma.Decimal(15000) },
            ],
          },
        },
      });

      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Lựa chọn thêm",
          isRequired: false,
          maxChoices: 3,
          choices: {
            create: [
              { name: "Thêm thịt nướng / quay", additionalPrice: new Prisma.Decimal(15000) },
              { name: "Thêm nem lụi (1 cây)", additionalPrice: new Prisma.Decimal(8000) },
              { name: "Thêm chả giò / ram", additionalPrice: new Prisma.Decimal(5000) },
              { name: "Thêm bún tươi", additionalPrice: new Prisma.Decimal(5000) },
            ],
          },
        },
      });

      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Yêu cầu chuẩn bị",
          isRequired: false,
          maxChoices: 3,
          choices: {
            create: [
              { name: "Không hành phi / mỡ hành", additionalPrice: new Prisma.Decimal(0) },
              { name: "Không lấy đậu phộng", additionalPrice: new Prisma.Decimal(0) },
              { name: "Nhiều nước chấm / mắm nêm", additionalPrice: new Prisma.Decimal(0) },
            ],
          },
        },
      });
      continue;
    }

    // 7. Rice Dishes (Cơm Tấm, Cơm Rang)
    if (
      catNameLower.includes("cơm tấm") ||
      catNameLower.includes("cơm rang") ||
      name.includes("cơm tấm") ||
      name.includes("cơm rang")
    ) {
      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Phần cơm",
          isRequired: true,
          maxChoices: 1,
          choices: {
            create: [
              { name: "Cơm thường", additionalPrice: new Prisma.Decimal(0) },
              { name: "Cơm thêm", additionalPrice: new Prisma.Decimal(5000) },
            ],
          },
        },
      });

      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Món ăn kèm",
          isRequired: false,
          maxChoices: 4,
          choices: {
            create: [
              { name: "Trứng ốp la", additionalPrice: new Prisma.Decimal(5000) },
              { name: "Lạp xưởng nướng", additionalPrice: new Prisma.Decimal(10000) },
              { name: "Chả chưng trứng", additionalPrice: new Prisma.Decimal(5000) },
              { name: "Bì thính", additionalPrice: new Prisma.Decimal(5000) },
              { name: "Canh thêm", additionalPrice: new Prisma.Decimal(5000) },
            ],
          },
        },
      });

      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Yêu cầu mỡ hành / đồ chua",
          isRequired: false,
          maxChoices: 3,
          choices: {
            create: [
              { name: "Không mỡ hành / hành phi", additionalPrice: new Prisma.Decimal(0) },
              { name: "Nhiều mỡ hành", additionalPrice: new Prisma.Decimal(0) },
              { name: "Không lấy đồ chua", additionalPrice: new Prisma.Decimal(0) },
            ],
          },
        },
      });
      continue;
    }

    // 8. Wraps, Pancakes & Rolls (Bánh xèo, Nem lụi, Ram cuốn cải, Bánh tráng cuốn thịt heo, Bánh tráng cuốn bò)
    if (
      catNameLower.includes("bánh xèo") ||
      catNameLower.includes("món cuốn") ||
      name.includes("ram cuốn cải") ||
      name.includes("bánh xèo") ||
      name.includes("nem lụi") ||
      name.includes("bánh tráng cuốn")
    ) {
      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Lựa chọn gọi thêm",
          isRequired: false,
          maxChoices: 4,
          choices: {
            create: [
              { name: "Rau sống & bánh tráng thêm", additionalPrice: new Prisma.Decimal(10000) },
              { name: "Bánh tráng cuốn thêm (1 xấp)", additionalPrice: new Prisma.Decimal(5000) },
              { name: "Nem lụi thêm (1 cây)", additionalPrice: new Prisma.Decimal(8000) },
              { name: "Bánh xèo thêm (1 cái)", additionalPrice: new Prisma.Decimal(15000) },
              { name: "Thịt heo cuốn thêm (1 dĩa)", additionalPrice: new Prisma.Decimal(35000) },
              { name: "Nước chấm / mắm nêm thêm", additionalPrice: new Prisma.Decimal(0) },
            ],
          },
        },
      });

      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Yêu cầu chuẩn bị",
          isRequired: false,
          maxChoices: 2,
          choices: {
            create: [
              { name: "Không lấy dưa chua / đu đủ chua", additionalPrice: new Prisma.Decimal(0) },
              { name: "Nhiều rau sống", additionalPrice: new Prisma.Decimal(0) },
            ],
          },
        },
      });
      continue;
    }

    // 9. Bánh Mì Thịt
    if (catNameLower.includes("bánh mì thịt") || (name.includes("bánh mì") && !name.includes("que") && !name.includes("sừng trâu"))) {
      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Yêu cầu chuẩn bị",
          isRequired: false,
          maxChoices: 4,
          choices: {
            create: [
              { name: "Không lấy hành ngò", additionalPrice: new Prisma.Decimal(0) },
              { name: "Không lấy đồ chua", additionalPrice: new Prisma.Decimal(0) },
              { name: "Không cay (Không ớt)", additionalPrice: new Prisma.Decimal(0) },
              { name: "Nhiều bơ pate", additionalPrice: new Prisma.Decimal(0) },
            ],
          },
        },
      });

      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Lựa chọn gọi thêm",
          isRequired: false,
          maxChoices: 3,
          choices: {
            create: [
              { name: "Thêm pate", additionalPrice: new Prisma.Decimal(5000) },
              { name: "Thêm trứng ốp la", additionalPrice: new Prisma.Decimal(5000) },
              { name: "Thêm thịt nướng / heo quay", additionalPrice: new Prisma.Decimal(10000) },
            ],
          },
        },
      });
      continue;
    }

    // 11. Bánh Mì Que
    if (name.includes("bánh mì que")) {
      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Mức độ cay",
          isRequired: true,
          maxChoices: 1,
          choices: {
            create: [
              { name: "Cay nhiều", additionalPrice: new Prisma.Decimal(0) },
              { name: "Cay vừa (Mặc định)", additionalPrice: new Prisma.Decimal(0) },
              { name: "Không cay", additionalPrice: new Prisma.Decimal(0) },
            ],
          },
        },
      });

      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Lựa chọn gọi thêm",
          isRequired: false,
          maxChoices: 1,
          choices: {
            create: [
              { name: "Thêm pate", additionalPrice: new Prisma.Decimal(5000) },
            ],
          },
        },
      });
      continue;
    }

    // 12. Pastries / Sweet Cakes (Bánh Sừng Trâu, Bánh Tiramisu, v.v.)
    if (name.includes("sừng trâu") || name.includes("tiramisu") || catNameLower.includes("bánh mì & ngọt")) {
      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Cách chuẩn bị",
          isRequired: true,
          maxChoices: 1,
          choices: {
            create: [
              { name: "Hâm nóng bánh (giòn thơm)", additionalPrice: new Prisma.Decimal(0) },
              { name: "Dùng lạnh / không hâm", additionalPrice: new Prisma.Decimal(0) },
            ],
          },
        },
      });

      await models.optionGroup.create({
        data: {
          menuItemId: item.id,
          name: "Lựa chọn gọi thêm",
          isRequired: false,
          maxChoices: 1,
          choices: {
            create: [
              { name: "Thêm sốt sô-cô-la", additionalPrice: new Prisma.Decimal(5000) },
            ],
          },
        },
      });
      continue;
    }

    // 13. Hotpots & Seafood
    if (catNameLower.includes("lẩu") || catNameLower.includes("hải sản tươi sống") || name.includes("lẩu") || name.includes("chíp chíp") || name.includes("mực trứng") || name.includes("tôm sú")) {
      if (catNameLower.includes("lẩu") || name.includes("lẩu")) {
        await models.optionGroup.create({
          data: {
            menuItemId: item.id,
            name: "Lựa chọn gọi thêm",
            isRequired: false,
            maxChoices: 4,
            choices: {
              create: [
                { name: "Thêm dĩa tôm mực tươi", additionalPrice: new Prisma.Decimal(60000) },
                { name: "Thêm dĩa ba chỉ bò", additionalPrice: new Prisma.Decimal(50000) },
                { name: "Thêm dĩa rau lẩu", additionalPrice: new Prisma.Decimal(15000) },
                { name: "Thêm mì gói (1 vắt)", additionalPrice: new Prisma.Decimal(5000) },
                { name: "Thêm bún tươi (1 dĩa)", additionalPrice: new Prisma.Decimal(5000) },
              ],
            },
          },
        });
      } else {
        await models.optionGroup.create({
          data: {
            menuItemId: item.id,
            name: "Mức độ cay",
            isRequired: true,
            maxChoices: 1,
            choices: {
              create: [
                { name: "Cay vừa (Mặc định)", additionalPrice: new Prisma.Decimal(0) },
                { name: "Cay nhiều", additionalPrice: new Prisma.Decimal(0) },
                { name: "Không cay", additionalPrice: new Prisma.Decimal(0) },
              ],
            },
          },
        });

        await models.optionGroup.create({
          data: {
            menuItemId: item.id,
            name: "Nước chấm thêm",
            isRequired: false,
            maxChoices: 2,
            choices: {
              create: [
                { name: "Thêm muối ớt xanh", additionalPrice: new Prisma.Decimal(0) },
                { name: "Thêm muối tiêu chanh", additionalPrice: new Prisma.Decimal(0) },
              ],
            },
          },
        });
      }
      continue;
    }

    // 14. Fallback for any other items that might not have matched
    await models.optionGroup.create({
      data: {
        menuItemId: item.id,
        name: "Yêu cầu đặc biệt",
        isRequired: false,
        maxChoices: 1,
        choices: {
          create: [
            { name: "Không lấy gia vị", additionalPrice: new Prisma.Decimal(0) },
            { name: "Thêm tương cà / tương ớt", additionalPrice: new Prisma.Decimal(0) },
          ],
        },
      },
    });
  }

  console.log("✅ Option groups and choices seeded");
}