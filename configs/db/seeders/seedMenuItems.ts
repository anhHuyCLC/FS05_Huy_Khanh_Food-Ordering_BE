import models from "@models";
import { Prisma } from "@db";

export async function seedMenuItems() {
  console.log("🌱 Seeding menu items...");

  const categories = await models.category.findMany({
    include: {
      restaurant: true,
    },
  });

  const dishesMap: Record<string, {name: string, desc: string, price: number, tag: string}[]> = {
    "Mì Quảng": [
      { name: "Mì Quảng Ếch", desc: "Đặc sản mì quảng ếch đồng nguyên thố", price: 45000, tag: "noodle" },
      { name: "Mì Quảng Gà Quê", desc: "Mì quảng gà ta thả vườn dai ngon", price: 40000, tag: "noodle" },
      { name: "Mì Quảng Tôm Thịt", desc: "Mì quảng tôm thịt trứng cút", price: 40000, tag: "noodle" },
    ],
    "Đặc Sản Đà Nẵng": [
      { name: "Bún Mắm Nêm", desc: "Bún mắm thịt luộc heo quay", price: 35000, tag: "noodle" },
      { name: "Ram Cuốn Cải", desc: "Ram tôm thịt giòn rụm cuốn lá cải", price: 40000, tag: "springrolls" },
    ],
    "Nước Giải Khát": [
      { name: "Pepsi / Coca", desc: "Nước ngọt có gas", price: 15000, tag: "soda" },
      { name: "Sữa Bắp", desc: "Sữa bắp nhà làm thơm béo", price: 20000, tag: "milk" },
      { name: "Nước Suối", desc: "Nước suối Aquafina", price: 10000, tag: "water" },
    ],
    "Đồ Uống": [
      { name: "Sữa Đậu Nành", desc: "Sữa đậu nành nguyên chất nóng/đá", price: 15000, tag: "milk" },
      { name: "Trà Đá", desc: "Trà đá mát lạnh", price: 5000, tag: "tea" },
      { name: "Pepsi / Coca", desc: "Nước ngọt có gas", price: 15000, tag: "drink" },
    ],
    "Bánh Xèo - Nem Lụi": [
      { name: "Bánh Xèo Tôm Nhảy", desc: "Bánh xèo miền Trung giòn rụm", price: 55000, tag: "crepe" },
      { name: "Nem Lụi", desc: "Nem lụi nướng sả (5 lụi)", price: 40000, tag: "skewers" },
      { name: "Bún Thịt Nướng", desc: "Bún thịt nướng than hoa", price: 35000, tag: "noodle" },
    ],
    "Hải Sản Tươi Sống": [
      { name: "Chíp Chíp Hấp Sả", desc: "Chíp chíp biển hấp sả ớt ngọt nước", price: 80000, tag: "seafood" },
      { name: "Mực Trứng Hấp Gừng", desc: "Mực trứng tươi sống hấp gừng", price: 150000, tag: "squid" },
      { name: "Tôm Sú Nướng Mọi", desc: "Tôm sú biển nướng", price: 200000, tag: "shrimp" },
    ],
    "Lẩu": [
      { name: "Lẩu Hải Sản Nước Thái", desc: "Lẩu chua cay tôm mực nghêu", price: 250000, tag: "hotpot" },
      { name: "Lẩu Cá Cu", desc: "Lẩu cá cu chua ngọt đặc sản", price: 220000, tag: "hotpot" },
    ],
    "Bia & Nước Ngọt": [
      { name: "Bia Tiger / Heineken", desc: "Bia ướp lạnh", price: 25000, tag: "beer" },
      { name: "Nước Khoáng", desc: "Nước khoáng Dasani", price: 15000, tag: "water" },
    ],
    "Cơm Tấm": [
      { name: "Cơm Tấm Sườn Bì Chả", desc: "Sườn nướng mềm, bì chả nhà làm", price: 55000, tag: "rice,meat" },
      { name: "Cơm Tấm Ba Chỉ Quay", desc: "Thịt heo quay giòn da", price: 50000, tag: "rice,pork" },
      { name: "Cơm Tấm Đùi Gà Nướng", desc: "Đùi gà góc tư nướng xốt mật ong", price: 55000, tag: "rice,chicken" },
    ],
    "Canh & Đồ Thêm": [
      { name: "Canh Khổ Qua Nhồi Thịt", desc: "Bát canh thanh mát", price: 25000, tag: "soup" },
      { name: "Thêm Sườn Nướng", desc: "1 miếng sườn cốt lết", price: 30000, tag: "meat" },
    ],
    "Bún Bò Huế": [
      { name: "Bún Bò Nạm Chả", desc: "Bún bò gân nạm chả cua", price: 45000, tag: "beef,noodle" },
      { name: "Bún Bò Đặc Biệt", desc: "Đầy đủ gân, nạm, chả, giò heo", price: 65000, tag: "noodle,soup" },
      { name: "Bún Bò O Còi", desc: "Tô nhỏ vừa ăn", price: 35000, tag: "pho" },
    ],
    "Trà Sữa": [
      { name: "Trà Sữa Trân Châu Đen", desc: "Trà sữa truyền thống signature", price: 45000, tag: "boba" },
      { name: "Hồng Trà Macchiato", desc: "Hồng trà kem cheese", price: 50000, tag: "milktea" },
      { name: "Trà Sữa Khoai Môn", desc: "Vị khoai môn bùi béo", price: 45000, tag: "bubbletea" },
    ],
    "Trà Trái Cây": [
      { name: "Trà Đào Cam Sả", desc: "Thanh mát giải nhiệt mùa hè", price: 45000, tag: "icetea" },
      { name: "Trà Vải Nhiệt Đới", desc: "Vị ngọt thanh của vải thiều", price: 45000, tag: "fruittea" },
    ],
    "Topping": [
      { name: "Trân Châu Trắng", desc: "Trân châu giòn sần sật", price: 10000, tag: "jelly" },
      { name: "Kem Cheese", desc: "Lớp milkfoam béo ngậy", price: 15000, tag: "cream" },
    ],
    "Cà Phê Truyền Thống": [
      { name: "Cà Phê Sữa Đá", desc: "Cà phê pha phin truyền thống", price: 29000, tag: "coffee" },
      { name: "Bạc Xỉu Đá", desc: "Bạc xỉu ba tầng thơm béo", price: 29000, tag: "latte" },
      { name: "Cà Phê Đen Đá", desc: "Cà phê đậm vị nguyên chất", price: 25000, tag: "espresso" },
    ],
    "Trà": [
      { name: "Trà Thanh Đào", desc: "Trà đào truyền thống", price: 39000, tag: "tea" },
      { name: "Trà Thạch Vải", desc: "Trà vải kèm thạch dai giòn", price: 39000, tag: "tea" },
    ],
    "Bánh Mì & Ngọt": [
      { name: "Bánh Mì Que", desc: "Bánh mì que pate pate cay", price: 15000, tag: "sandwich" },
      { name: "Bánh Sừng Trâu", desc: "Croissant ngàn lớp", price: 35000, tag: "croissant" },
      { name: "Bánh Tiramisu", desc: "Bánh phô mai Ý", price: 45000, tag: "cake" },
    ],
    "Món Cuốn": [
      { name: "Bánh Tráng Cuốn Thịt Heo", desc: "Thịt heo hai đầu da, rau rừng", price: 120000, tag: "springrolls" },
      { name: "Bánh Tráng Cuốn Bò", desc: "Thịt bò bắp luộc", price: 150000, tag: "beef,roll" },
    ],
    "Phở bò": [
      { name: "Phở Bò Tái Nạm", desc: "Phở nước trong thanh ngọt cốt xương bò", price: 50000, tag: "pho" },
      { name: "Phở Đặc Biệt", desc: "Tái, nạm, gầu, gân, bò viên", price: 70000, tag: "beef,noodle" },
    ],
    "Cơm Rang": [
      { name: "Cơm Rang Dưa Bò", desc: "Cơm rang giòn kèm dưa bò xào", price: 60000, tag: "friedrice" },
      { name: "Cơm Rang Trứng", desc: "Cơm rang trứng hành phi", price: 35000, tag: "friedrice" },
    ],
    "Bánh Mì Thịt": [
      { name: "Bánh Mì Thịt Nướng", desc: "Bánh mì Hội An nhân thịt nướng", price: 30000, tag: "sandwich" },
      { name: "Bánh Mì Heo Quay", desc: "Bánh mì heo quay da giòn", price: 30000, tag: "banhmi" },
      { name: "Bánh Mì Xíu Mại Trứng", desc: "Xíu mại thơm mềm", price: 25000, tag: "sandwich" },
    ],
  };

  let count = 0;
  for (let i = 0; i < categories.length; i++) {
    const categoryName = categories[i].name;
    const dishes = dishesMap[categoryName] || [
      { name: `${categoryName} Đặc Biệt`, desc: `Món ngon ${categoryName}`, price: 50000, tag: "food" },
      { name: `${categoryName} Truyền Thống`, desc: `Món truyền thống ${categoryName}`, price: 40000, tag: "food" }
    ];

    for (let j = 0; j < dishes.length; j++) {
      count++;
      await models.menuItem.create({
        data: {
          restaurantId: categories[i].restaurantId,
          categoryId: categories[i].id,
          name: dishes[j].name,
          description: dishes[j].desc,
          basePrice: new Prisma.Decimal(dishes[j].price),
          imageUrl: `https://loremflickr.com/400/400/${dishes[j].tag},food?lock=${count}`,
          isAvailable: true,
        },
      });
    }
  }

  console.log("✅ Menu items seeded");
}