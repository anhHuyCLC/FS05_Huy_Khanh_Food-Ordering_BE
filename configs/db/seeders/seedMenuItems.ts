import models from "@models";
import { Prisma } from "@db";

export async function seedMenuItems() {
  console.log("🌱 Seeding menu items with stable Image CDN...");

  const categories = await models.category.findMany({
    include: {
      restaurant: true,
    },
  });

  const dishesMap: Record<
    string,
    { name: string; desc: string; price: number; img: string }[]
  > = {
    "Món Việt": [
      {
        name: "Mì Quảng Ếch",
        desc: "Đặc sản mì quảng ếch đồng nguyên thố chuẩn vị",
        price: 45000,
        // Mì Quảng với ếch – tô mì vàng với nhân ếch và rau thơm
        img: "https://upload.wikimedia.org/wikipedia/commons/5/57/M%C3%AC_Qu%E1%BA%A3ng%2C_Da_Nang%2C_Vietnam.jpg",
      },
      {
        name: "Bánh Xèo Tôm Nhảy",
        desc: "Bánh xèo miền Trung giòn rụm nhân tôm tươi",
        price: 55000,
        // Bánh xèo – bánh crepe giòn vàng với tôm tươi
        img: "https://upload.wikimedia.org/wikipedia/commons/0/05/Banh_Xeo%2C_Eden_Center.jpg",
      },
      {
        name: "Bún Mắm Nêm",
        desc: "Bún mắm thịt luộc heo quay đặc sản Đà Nẵng",
        price: 35000,
        // Bún mắm – tô bún với thịt heo và rau sống
        img: "https://upload.wikimedia.org/wikipedia/commons/8/80/B%C3%BAn_m%E1%BA%AFm.jpg",
      },
    ],
    "Vietnamese": [
      {
        name: "Bánh Tráng Cuốn Thịt Heo",
        desc: "Thịt heo hai đầu da, rau rừng, bánh tráng mỏng",
        price: 120000,
        // Bánh tráng cuốn – cuốn thịt heo với rau và bánh tráng
        img: "https://upload.wikimedia.org/wikipedia/commons/9/90/G%E1%BB%8Fi_cu%E1%BB%91n.jpg",
      },
      {
        name: "Nem Lụi Nướng",
        desc: "Nem lụi nướng sả (5 lụi), chấm mắm nêm đậm đà",
        price: 40000,
        // Nem lụi – xiên nem nướng thơm trên than hồng
        img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
      },
    ],
    "Cơm": [
      {
        name: "Cơm Tấm Sườn Bì Chả",
        desc: "Sườn nướng mềm, bì chả nhà làm, nước mắm pha đặc biệt",
        price: 55000,
        // Cơm tấm sườn – đĩa cơm tấm với sườn nướng vàng óng
        img: "https://upload.wikimedia.org/wikipedia/commons/e/ea/C%C6%A1m_t%E1%BA%A5m_b%C3%AC_ch%E1%BA%A3.jpg",
      },
      {
        name: "Cơm Tấm Ba Chỉ Quay",
        desc: "Thịt heo quay giòn da ăn kèm dưa cải chua ngọt",
        price: 50000,
        // Thịt heo quay – miếng thịt ba chỉ quay giòn da vàng
        img: "https://upload.wikimedia.org/wikipedia/commons/4/40/C%C6%A1m_t%E1%BA%A5m_s%C6%B0%E1%BB%9Dn_c%C3%A2y.JPG",
      },
      {
        name: "Cơm Tấm Đùi Gà Nướng",
        desc: "Đùi gà nướng xốt mật ong thơm phức vàng óng",
        price: 55000,
        // Đùi gà nướng – đùi gà nướng mật ong vàng thơm
        img: "https://upload.wikimedia.org/wikipedia/commons/4/40/C%C6%A1m_t%E1%BA%A5m_s%C6%B0%E1%BB%9Dn_c%C3%A2y.JPG",
      },
    ],
    "Rice": [
      {
        name: "Cơm Hộp Gà Chiên Nước Mắm",
        desc: "Gà chiên giòn xốt nước mắm tỏi ớt đậm đà",
        price: 45000,
        // Gà chiên nước mắm – miếng gà chiên vàng xốt nước mắm
        img: "https://images.unsplash.com/photo-1543353071-10c8ba85a904?w=800&q=80",
      },
      {
        name: "Cơm Hộp Thịt Kho Trứng",
        desc: "Thịt ba chỉ kho trứng vị đậm đà truyền thống chuẩn cơm mẹ nấu",
        price: 40000,
        // Thịt kho trứng – thịt ba chỉ kho màu cánh gián với trứng
        img: "https://upload.wikimedia.org/wikipedia/commons/e/ea/C%C6%A1m_t%E1%BA%A5m_b%C3%AC_ch%E1%BA%A3.jpg",
      },
    ],
    "Mì": [
      {
        name: "Mì Quảng Gà Quê",
        desc: "Mì quảng gà ta thả vườn dai ngon ngọt thịt",
        price: 40000,
        // Mì Quảng gà – tô mì vàng với thịt gà ta và rau thơm
        img: "https://upload.wikimedia.org/wikipedia/commons/5/57/M%C3%AC_Qu%E1%BA%A3ng%2C_Da_Nang%2C_Vietnam.jpg",
      },
      {
        name: "Bún Bò Huế Đặc Biệt",
        desc: "Gân, nạm, chả, giò heo – tô đầy đủ nhất",
        price: 65000,
        // Bún bò Huế – tô bún đỏ cay với thịt bò và giò heo
        img: "https://upload.wikimedia.org/wikipedia/commons/e/e2/Bun_Bo_Hue_in_Sai_Gon.jpg",
      },
    ],
    "Pho": [
      {
        name: "Phở Bò Tái Nạm",
        desc: "Phở nước trong thanh ngọt, cốt xương bò hầm 12 tiếng",
        price: 50000,
        // Phở bò – tô phở trong vắt với tái nạm và rau thơm
        img: "https://upload.wikimedia.org/wikipedia/commons/e/e1/Pho_bo.jpg",
      },
      {
        name: "Phở Đặc Biệt",
        desc: "Tái, nạm, gầu, gân, bò viên – đầy đủ trọn vẹn hương vị",
        price: 70000,
        // Phở đặc biệt – tô phở đầy đủ các loại thịt bò
        img: "https://upload.wikimedia.org/wikipedia/commons/0/0f/Pho_in_Saigon.jpg",
      },
    ],
    "Noodles": [
      {
        name: "Mì Xào Hải Sản",
        desc: "Mì vàng xào giòn cùng tôm mực tươi ngon",
        price: 75000,
        // Mì xào hải sản – đĩa mì xào với tôm mực rau củ
        img: "https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=800&q=80",
      },
      {
        name: "Bún Riêu Cua",
        desc: "Bún riêu cua đồng nguyên chất kèm gạch cua béo ngậy",
        price: 45000,
        // Bún riêu – tô bún đỏ với riêu cua và cà chua
        img: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&q=80",
      },
    ],
    "Trà sữa": [
      {
        name: "Trà Sữa Trân Châu Đen",
        desc: "Trà sữa truyền thống vị đậm đà thơm béo signature",
        price: 45000,
        // Trà sữa trân châu đen – ly trà sữa nâu với trân châu đen
        img: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=800&q=80",
      },
      {
        name: "Hồng Trà Macchiato",
        desc: "Hồng trà thanh mát kết hợp lớp kem cheese béo ngậy",
        price: 50000,
        // Trà macchiato – ly trà với lớp kem cheese trắng mịn
        img: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=800&q=80",
      },
      {
        name: "Trà Sữa Khoai Môn",
        desc: "Vị khoai môn bùi béo kết hợp cùng hạt trân châu dẻo dai",
        price: 45000,
        // Trà sữa khoai môn – ly trà sữa tím đặc trưng
        img: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=800&q=80",
      },
    ],
    "Milk Tea": [
      {
        name: "Brown Sugar Boba",
        desc: "Sữa tươi trân châu đường đen ngọt ngào đậm vị",
        price: 55000,
        // Brown sugar boba – ly sữa tươi với trân châu đường đen và sọc caramel
        img: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=800&q=80",
      },
      {
        name: "Matcha Latte Trân Châu",
        desc: "Trà xanh Nhật Bản nguyên chất pha sữa tươi",
        price: 55000,
        // Matcha latte – ly matcha xanh đẹp với lớp sữa mịn
        img: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=800&q=80",
      },
    ],
    "Boba": [
      {
        name: "Trà Đào Cam Sả",
        desc: "Thức uống thanh mát giải nhiệt mùa hè sảng khoái",
        price: 45000,
        // Trà đào – ly trà đào cam vàng hồng mát lạnh
        img: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=800&q=80",
      },
      {
        name: "Trân Châu Trắng (add-on)",
        desc: "Trân châu trắng giòn sần sật thêm vào thức uống",
        price: 10000,
        // Trân châu – hạt trân châu trắng trong ly thức uống
        img: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=800&q=80",
      },
    ],
    "Coffee": [
      {
        name: "Cà Phê Sữa Đá",
        desc: "Cà phê pha phin truyền thống đậm đà chuẩn gu Việt",
        price: 29000,
        // Cà phê sữa đá – ly cà phê sữa đá Việt Nam chuẩn vị
        img: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Highlands_Coffee_drip_filter_and_cup.jpg",
      },
      {
        name: "Bạc Xỉu Đá",
        desc: "Bạc xỉu ba tầng thơm béo ngậy mùi sữa",
        price: 29000,
        // Bạc xỉu – ly cà phê sữa nhiều sữa đặc trưng miền Nam
        img: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Highlands_Coffee_drip_filter_and_cup.jpg",
      },
      {
        name: "Cold Brew",
        desc: "Cà phê ủ lạnh thanh khiết giữ trọn hương mộc",
        price: 45000,
        // Cold brew – ly cà phê đen ủ lạnh trong vắt với đá
        img: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=80",
      },
    ],
    "Cà phê": [
      {
        name: "Cà Phê Đen Đá",
        desc: "Cà phê đậm vị nguyên chất rang xay mộc mạc",
        price: 25000,
        // Cà phê đen đá – ly cà phê đen đậm với đá viên
        img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&q=80",
      },
      {
        name: "Cappuccino",
        desc: "Espresso pha sữa tươi tạo lớp bọt mịn dày mượt",
        price: 55000,
        // Cappuccino – ly cappuccino với lớp bọt sữa mịn và latte art
        img: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Highlands_Coffee_drip_filter_and_cup.jpg",
      },
    ],
    "Drinks": [
      {
        name: "Pepsi / Coca",
        desc: "Nước ngọt có gas lon 330ml mát lạnh",
        price: 15000,
        // Lon nước ngọt – lon Pepsi/Coca lạnh với đá
        img: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=800&q=80",
      },
      {
        name: "Nước Suối",
        desc: "Nước suối đóng chai tinh khiết 500ml",
        price: 10000,
        // Nước suối – chai nước khoáng tinh khiết
        img: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&q=80",
      },
    ],
    "Beverage": [
      {
        name: "Nước Ép Cam",
        desc: "Cam vắt tươi nguyên chất giàu Vitamin C",
        price: 35000,
        // Nước ép cam – ly nước ép cam tươi vàng óng
        img: "https://upload.wikimedia.org/wikipedia/commons/0/04/Orange_juice_glass.jpg",
      },
    ],
    "Pizza": [
      {
        name: "Pizza Hải Sản",
        desc: "Đế giòn phủ tôm mực tươi ngon cùng xốt cà chua đậm đà",
        price: 199000,
        // Pizza hải sản – pizza với tôm mực và phô mai mozzarella
        img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80",
      },
      {
        name: "Pizza Phô Mai 4 Loại",
        desc: "Sự kết hợp hoàn hảo giữa các lớp Mozzarella, Cheddar, Gouda",
        price: 189000,
        // Pizza 4 phô mai – pizza vàng ươm nhiều lớp phô mai
        img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80",
      },
    ],
    "Burger": [
      {
        name: "Classic Beef Burger",
        desc: "Bò nhập khẩu nướng mềm, rau xà lách kèm sốt đặc biệt",
        price: 89000,
        // Burger bò – burger cổ điển với thịt bò nướng và rau
        img: "https://upload.wikimedia.org/wikipedia/commons/d/dd/Hamburger_in_Inari.jpg",
      },
    ],
    "Fast Food": [
      {
        name: "Khoai Tây Chiên (M)",
        desc: "Khoai tây chiên vàng giòn rụm rắc muối nhẹ",
        price: 35000,
        // Khoai tây chiên – đĩa khoai tây chiên vàng giòn
        img: "https://upload.wikimedia.org/wikipedia/commons/d/df/McDonald%27s_French_fries_Potato_%2801%29.jpg",
      },
    ],
    "Lẩu": [
      {
        name: "Lẩu Thái Hải Sản",
        desc: "Lẩu chua cay tôm mực nghêu chuẩn vị Tom Yum nồng nàn",
        price: 250000,
        // Lẩu Thái hải sản – nồi lẩu đỏ cay với tôm mực nghêu
        img: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800&q=80",
      },
    ],
    "Hotpot": [
      {
        name: "Lẩu Nấm Chay",
        desc: "Nấm hương ngọt nước thanh đạm sảng khoái tinh thần",
        price: 180000,
        // Lẩu nấm – nồi lẩu nấm hương trong ngọt thanh đạm
        img: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800&q=80",
      },
    ],
    "Sushi": [
      {
        name: "Sashimi Cá Hồi (8 miếng)",
        desc: "Cá hồi nhập khẩu cắt lát dày tươi ngon ngọt thịt",
        price: 180000,
        // Sashimi cá hồi – lát cá hồi đỏ tươi xếp đẹp trên đĩa
        img: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Traditional_Sashimi_with_a_twist.jpg",
      },
    ],
    "Seafood": [
      {
        name: "Chíp Chíp Hấp Sả",
        desc: "Chíp chíp biển tươi rói hấp sả ớt cay nồng đậm đà nước ngọt",
        price: 80000,
        // Chíp chíp hấp sả – nghêu/ngao hấp sả xanh thơm
        img: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&q=80",
      },
    ],
    "Asian": [
      {
        name: "Pad Thai Tôm Tươi",
        desc: "Hủ tiếu xào kiểu Thái đậm vị hải sản chua ngọt quyến rũ",
        price: 85000,
        // Pad Thai – đĩa pad thai vàng với tôm tươi và đậu phộng
        img: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Pad_Thai_shrimp_at_Food_Republic.jpg",
      },
    ],
    "Chicken": [
      {
        name: "Gà Rán Giòn Rụm",
        desc: "Gà rán giòn rụm lớp vỏ ngoài thơm ngậy vàng óng ả",
        price: 69000,
        // Gà rán – miếng gà chiên vàng giòn bắt mắt
        img: "https://upload.wikimedia.org/wikipedia/commons/2/24/Vietnamese_KFC.jpg",
      },
    ],
    "Healthy": [
      {
        name: "Salad Bowl Gà Nướng",
        desc: "Rau xà lách sạch, ức gà nướng sốt dầu olive thanh đạm",
        price: 89000,
        // Salad bowl – tô salad xanh với ức gà nướng và sốt
        img: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80",
      },
    ],
    "Bánh": [
      {
        name: "Bánh Mì Kẹp Thịt",
        desc: "Bánh mì giòn rụm kẹp pate, chả bơ truyền thống Việt Nam",
        price: 30000,
        // Bánh mì kẹp – ổ bánh mì cắt đôi với nhân đa dạng
        img: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Banh_mi_and_cuon.jpg",
      },
    ],
  };

  const fallbackDishes = (categoryName: string) => [
    {
      name: `${categoryName} Đặc Biệt`,
      desc: `Món ngon đặc sản mang đậm dấu ấn quán ${categoryName}`,
      price: 50000,
      img: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80",
    },
  ];

  for (let i = 0; i < categories.length; i++) {
    const categoryName = categories[i].name;
    const dishes = dishesMap[categoryName] || fallbackDishes(categoryName);

    for (let j = 0; j < dishes.length; j++) {
      await models.menuItem.create({
        data: {
          restaurantId: categories[i].restaurantId,
          categoryId: categories[i].id,
          name: dishes[j].name,
          description: dishes[j].desc,
          basePrice: new Prisma.Decimal(dishes[j].price),
          imageUrl: dishes[j].img,
          isAvailable: true,
        },
      });
    }
  }

  console.log("✅ Menu items seeded.");
}