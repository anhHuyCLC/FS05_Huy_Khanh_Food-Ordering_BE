import { Prisma } from "@db";
import models from "@models";

export async function seedRestaurants() {
  console.log("🌱 Seeding restaurants...");

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
      cuisineType: "pho",
      openTime: "06:00", closeTime: "21:00",
      img: "https://images.unsplash.com/photo-1552611052-33e04de081de?w=800&q=80",
    },
    {
      name: "Bánh Xèo Bà Dưỡng",
      desc: "Bánh xèo giòn rụm, nem lụi thơm ngon đặc sản Đà Nẵng",
      address: "K280/23 Hoàng Diệu, Hải Châu, Đà Nẵng",
      lat: 16.0594, lng: 108.2154,
      cuisineType: "food",
      openTime: "10:00", closeTime: "22:00",
      img: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800&q=80",
    },
    {
      name: "Hải Sản Năm Rảnh",
      desc: "Hải sản tươi sống, giá cả bình dân ngay tại bãi biển",
      address: "71 Chương Dương, Ngũ Hành Sơn, Đà Nẵng",
      lat: 16.0460, lng: 108.2396,
      cuisineType: "hotpot",
      openTime: "10:00", closeTime: "23:00",
      img: "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=800&q=80",
    },
    {
      name: "Cơm Tấm Sài Gòn",
      desc: "Cơm tấm sườn bì chả truyền thống Nam Bộ",
      address: "145 Nguyễn Văn Linh, Hải Châu, Đà Nẵng",
      lat: 16.0613, lng: 108.2109,
      cuisineType: "rice-box",
      openTime: "07:00", closeTime: "21:00",
      img: "https://images.unsplash.com/photo-1599046679481-60e1f9c6b0c8?w=800&q=80",
    },
    {
      name: "Bún Bò Bà Diệu",
      desc: "Bún bò Huế cay nồng hấp dẫn, nước dùng đậm vị",
      address: "17 Trần Tống, Thanh Khê, Đà Nẵng",
      lat: 16.0619, lng: 108.2045,
      cuisineType: "pho",
      openTime: "06:00", closeTime: "13:00",
      img: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&q=80",
    },
    {
      name: "Trà Sữa Gong Cha",
      desc: "Trà sữa trân châu chuẩn vị Đài Loan, hơn 50 loại",
      address: "225 Nguyễn Văn Linh, Thanh Khê, Đà Nẵng",
      lat: 16.0607, lng: 108.2078,
      cuisineType: "milk-tea",
      openTime: "09:00", closeTime: "22:30",
      img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    },
    {
      name: "Highlands Coffee",
      desc: "Cà phê pha phin truyền thống, không gian thoáng đãng",
      address: "74 Bạch Đằng, Hải Châu, Đà Nẵng",
      lat: 16.0711, lng: 108.2241,
      cuisineType: "coffee",
      openTime: "07:00", closeTime: "22:00",
      img: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&q=80",
    },
    {
      name: "Bánh Tráng Cuốn Thịt Heo Trần",
      desc: "Đặc sản Đà Nẵng – bánh tráng cuốn thịt heo hai đầu da",
      address: "4 Lê Duẩn, Hải Châu, Đà Nẵng",
      lat: 16.0722, lng: 108.2227,
      cuisineType: "food",
      openTime: "10:00", closeTime: "22:00",
      img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80",
    },
    {
      name: "Phở 29",
      desc: "Phở bò Hà Nội truyền thống, nước dùng hầm 12 tiếng",
      address: "35 Trần Quốc Toản, Hải Châu, Đà Nẵng",
      lat: 16.0682, lng: 108.2226,
      cuisineType: "pho",
      openTime: "06:00", closeTime: "22:00",
      img: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&q=80",
    },
    {
      name: "Bánh Mì Phượng",
      desc: "Bánh mì nổi tiếng Hội An, nhân thịt nướng xíu mại",
      address: "80 Nguyễn Thái Học, Hải Châu, Đà Nẵng",
      lat: 16.0700, lng: 108.2220,
      cuisineType: "fast-food",
      openTime: "06:30", closeTime: "20:00",
      img: "https://images.unsplash.com/photo-1600628421060-3b8f8b5f2c14?w=800&q=80",
    },
    {
      name: "Domino's Pizza Đà Nẵng",
      desc: "Pizza Mỹ thứ thiệt, đế dày/mỏng tuỳ chọn, giao hàng nhanh 30 phút",
      address: "112 Nguyễn Văn Linh, Hải Châu, Đà Nẵng",
      lat: 16.0650, lng: 108.2100,
      cuisineType: "pizza-burger",
      openTime: "10:00", closeTime: "23:00",
      img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80",
    },
    {
      name: "Lẩu Thái Mama",
      desc: "Lẩu Thái chua cay đúng vị, nguyên liệu tươi nhập hằng ngày",
      address: "38 Ngô Quyền, Sơn Trà, Đà Nẵng",
      lat: 16.0730, lng: 108.2340,
      cuisineType: "hotpot",
      openTime: "11:00", closeTime: "23:00",
      img: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80",
    },
    {
      name: "Sakura Sushi",
      desc: "Sushi Nhật Bản chính thống, cá hồi Na Uy nhập khẩu tươi",
      address: "62 Trần Phú, Hải Châu, Đà Nẵng",
      lat: 16.0680, lng: 108.2200,
      cuisineType: "sushi",
      openTime: "11:00", closeTime: "22:00",
      img: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80",
    },
    {
      name: "KFC Đà Nẵng",
      desc: "Gà rán giòn rụm công thức bí truyền 11 gia vị",
      address: "257 Hùng Vương, Thanh Khê, Đà Nẵng",
      lat: 16.0580, lng: 108.2020,
      cuisineType: "fried-chicken",
      openTime: "09:00", closeTime: "22:30",
      img: "https://images.unsplash.com/photo-1562802378-063ec186a863?w=800&q=80",
    },
    {
      name: "Cơm Hộp Bà Năm",
      desc: "Cơm hộp văn phòng, đặt trước 30 phút, giao tận nơi",
      address: "22 Lê Lợi, Hải Châu, Đà Nẵng",
      lat: 16.0670, lng: 108.2210,
      cuisineType: "rice-box",
      openTime: "10:30", closeTime: "20:00",
      img: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800&q=80",
    },
    {
      name: "Green Bite – Healthy Bowl",
      desc: "Salad bowl, smoothie bowl và thực đơn healthy cho cuộc sống năng động",
      address: "18 An Thượng 4, Ngũ Hành Sơn, Đà Nẵng",
      lat: 16.0510, lng: 108.2480,
      cuisineType: "healthy",
      openTime: "07:00", closeTime: "21:00",
      img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
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

  console.log("✅ Restaurants seeded");
}