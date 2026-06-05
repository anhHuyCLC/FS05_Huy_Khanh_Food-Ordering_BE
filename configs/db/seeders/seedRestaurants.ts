import { Prisma } from "@db";
import models from "@models";

export async function seedRestaurants() {
  console.log("🌱 Seeding restaurants with stable Image CDN...");

  const restaurantUsers = await models.user.findMany({
    where: {
      roles: {
        some: {
          role: { code: "RESTAURANT" }
        }
      }
    },
    include: { profile: true }
  });

  const daNangRestaurants = [
    {
      name: "Mì Quảng Bà Mua",
      desc: "Đậm đà hương vị Mì Quảng chính gốc Đà Nẵng",
      address: "95A Nguyễn Tri Phương, Hải Châu, Đà Nẵng",
      lat: 16.0617, lng: 108.2120,
      cuisineType: "Món Việt",
      openTime: "06:00", closeTime: "21:00",
      // Mì Quảng – tô mì màu vàng đặc trưng với tôm, thịt, rau thơm
      img: "https://upload.wikimedia.org/wikipedia/commons/5/57/M%C3%AC_Qu%E1%BA%A3ng%2C_Da_Nang%2C_Vietnam.jpg",
    },
    {
      name: "Bánh Xèo Bà Dưỡng",
      desc: "Bánh xèo giòn rụm, nem lụi thơm ngon đặc sản Đà Nẵng",
      address: "K280/23 Hoàng Diệu, Hải Châu, Đà Nẵng",
      lat: 16.0594, lng: 108.2154,
      cuisineType: "Vietnamese",
      openTime: "10:00", closeTime: "22:00",
      // Bánh xèo – bánh crepe vàng giòn với nhân tôm thịt
      img: "https://upload.wikimedia.org/wikipedia/commons/8/82/Banh_Xeo_Restaurant_Hanoi.JPG",
    },
    {
      name: "Hải Sản Năm Rảnh",
      desc: "Hải sản tươi sống, giá cả bình dân ngay tại bãi biển",
      address: "71 Chương Dương, Ngũ Hành Sơn, Đà Nẵng",
      lat: 16.0460, lng: 108.2396,
      cuisineType: "Seafood",
      openTime: "10:00", closeTime: "23:00",
      // Hải sản tươi – tôm cua cá trên đĩa
      img: "https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=800&q=80",
    },
    {
      name: "Cơm Tấm Sài Gòn",
      desc: "Cơm tấm sườn bì chả truyền thống Nam Bộ",
      address: "145 Nguyễn Văn Linh, Hải Châu, Đà Nẵng",
      lat: 16.0613, lng: 108.2109,
      cuisineType: "Cơm",
      openTime: "07:00", closeTime: "21:00",
      // Cơm tấm – đĩa cơm với sườn nướng và các món kèm
      img: "https://upload.wikimedia.org/wikipedia/commons/b/b0/C%C6%A1m_T%E1%BA%A5m%2C_Da_Nang%2C_Vietnam.jpg",
    },
    {
      name: "Bún Bò Bà Diệu",
      desc: "Bún bò Huế cay nồng hấp dẫn, nước dùng đậm vị",
      address: "17 Trần Tống, Thanh Khê, Đà Nẵng",
      lat: 16.0619, lng: 108.2045,
      cuisineType: "Mì",
      openTime: "06:00", closeTime: "13:00",
      // Bún bò Huế – tô bún đỏ cay với thịt bò và giò heo
      img: "https://upload.wikimedia.org/wikipedia/commons/e/e2/Bun_Bo_Hue_in_Sai_Gon.jpg",
    },
    {
      name: "Trà Sữa Gong Cha",
      desc: "Trà sữa trân châu chuẩn vị Đài Loan, hơn 50 loại",
      address: "225 Nguyễn Văn Linh, Thanh Khê, Đà Nẵng",
      lat: 16.0607, lng: 108.2078,
      cuisineType: "Trà sữa",
      openTime: "09:00", closeTime: "22:30",
      // Trà sữa trân châu – ly trà sữa với trân châu đen
      img: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=800&q=80",
    },
    {
      name: "Highlands Coffee",
      desc: "Cà phê pha phin truyền thống, không gian thoáng đãng",
      address: "74 Bạch Đằng, Hải Châu, Đà Nẵng",
      lat: 16.0711, lng: 108.2241,
      cuisineType: "Coffee",
      openTime: "07:00", closeTime: "22:00",
      // Cà phê Việt – phin cà phê sữa đá truyền thống
      img: "https://upload.wikimedia.org/wikipedia/commons/d/dc/Highlands_Coffee_storefront_DN.JPG",
    },
    {
      name: "Bánh Tráng Cuốn Thịt Heo Trần",
      desc: "Đặc sản Đà Nẵng – bánh tráng cuốn thịt heo hai đầu da",
      address: "4 Lê Duẩn, Hải Châu, Đà Nẵng",
      lat: 16.0722, lng: 108.2227,
      cuisineType: "Asian",
      openTime: "10:00", closeTime: "22:00",
      // Cuốn thịt heo – bánh tráng cuốn rau và thịt heo
      img: "https://upload.wikimedia.org/wikipedia/commons/9/90/G%E1%BB%8Fi_cu%E1%BB%91n.jpg",
    },
    {
      name: "Phở Lộc",
      desc: "Phở bò truyền thống, nước dùng hầm 12 tiếng lâu đời",
      address: "35 Trần Quốc Toản, Hải Châu, Đà Nẵng",
      lat: 16.0682, lng: 108.2226,
      cuisineType: "Pho",
      openTime: "06:00", closeTime: "22:00",
      // Phở bò – tô phở trong với thịt bò và rau thơm
      img: "https://upload.wikimedia.org/wikipedia/commons/e/e1/Pho_bo.jpg",
    },
    {
      name: "Bánh Mì Đồng Tiến",
      desc: "Hệ thống bánh mì, bánh ngọt sạch sẽ thơm ngon",
      address: "80 Nguyễn Thái Học, Hải Châu, Đà Nẵng",
      lat: 16.0700, lng: 108.2220,
      cuisineType: "Bánh",
      openTime: "06:30", closeTime: "20:00",
      // Bánh mì – ổ bánh mì kẹp nhân pate thịt
      img: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Banh_mi_and_cuon.jpg",
    },
    {
      name: "Domino's Pizza Đà Nẵng",
      desc: "Pizza Mỹ thứ thiệt, đế dày/mỏng tuỳ chọn, giao hàng nhanh",
      address: "112 Nguyễn Văn Linh, Hải Châu, Đà Nẵng",
      lat: 16.0650, lng: 108.2100,
      cuisineType: "Pizza",
      openTime: "10:00", closeTime: "23:00",
      // Pizza – pizza với nhiều topping phô mai
      img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80",
    },
    {
      name: "Lẩu Thái Mama",
      desc: "Lẩu Thái chua cay đúng vị, nguyên liệu tươi nhập hằng ngày",
      address: "38 Ngô Quyền, Sơn Trà, Đà Nẵng",
      lat: 16.0730, lng: 108.2340,
      cuisineType: "Lẩu",
      openTime: "11:00", closeTime: "23:00",
      // Lẩu Thái – nồi lẩu chua cay với hải sản tươi
      img: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800&q=80",
    },
    {
      name: "Sakura Sushi Shop",
      desc: "Sushi Nhật Bản chính thống, cá hồi Na Uy nhập khẩu tươi",
      address: "62 Trần Phú, Hải Châu, Đà Nẵng",
      lat: 16.0680, lng: 108.2200,
      cuisineType: "Sushi",
      openTime: "11:00", closeTime: "22:00",
      // Sushi – đĩa sushi và sashimi cá hồi tươi
      img: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Sushi_Roll.jpg",
    },
    {
      name: "KFC Nguyễn Văn Linh",
      desc: "Gà rán giòn rụm công thức bí truyền 11 gia vị",
      address: "257 Hùng Vương, Thanh Khê, Đà Nẵng",
      lat: 16.0580, lng: 108.2020,
      cuisineType: "Chicken",
      openTime: "09:00", closeTime: "22:30",
      // Gà rán – miếng gà rán vàng giòn
      img: "https://upload.wikimedia.org/wikipedia/commons/2/24/Vietnamese_KFC.jpg",
    },
    {
      name: "Cơm Hộp Văn Phòng Bà Năm",
      desc: "Cơm hộp văn phòng tiện lợi, thực đơn đổi mới mỗi ngày",
      address: "22 Lê Lợi, Hải Châu, Đà Nẵng",
      lat: 16.0670, lng: 108.2210,
      cuisineType: "Rice",
      openTime: "10:30", closeTime: "20:00",
      // Cơm hộp – hộp cơm văn phòng với nhiều món kèm
      img: "https://images.unsplash.com/photo-1543353071-10c8ba85a904?w=800&q=80",
    },
    {
      name: "Green Bite – Healthy Bowl",
      desc: "Salad bowl, smoothie bowl và thực đơn tốt cho sức khỏe",
      address: "18 An Thượng 4, Ngũ Hành Sơn, Đà Nẵng",
      lat: 16.0510, lng: 108.2480,
      cuisineType: "Healthy",
      openTime: "07:00", closeTime: "21:00",
      // Salad bowl – tô salad rau xanh với ức gà nướng
      img: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80",
    },
  ];

  for (let i = 0; i < daNangRestaurants.length; i++) {
    const r = daNangRestaurants[i];
    const ownerUser = restaurantUsers[i % restaurantUsers.length];
    if (!ownerUser || !ownerUser.profile) continue;

    await models.restaurant.create({
      data: {
        ownerId: ownerUser.profile.id,
        name: r.name,
        description: r.desc,
        address: r.address,
        imageUrl: r.img,
        latitude: new Prisma.Decimal(r.lat),
        longitude: new Prisma.Decimal(r.lng),
        isActive: true,
        approvalStatus: "APPROVED",
        commissionRate: new Prisma.Decimal(10.0),
        rating: new Prisma.Decimal(Math.round((4.2 + Math.random() * 0.8) * 10) / 10),
        cuisineType: r.cuisineType,
        openTime: r.openTime,
        closeTime: r.closeTime,
      },
    });
  }

  console.log("✅ Restaurants seeded successfully.");
}