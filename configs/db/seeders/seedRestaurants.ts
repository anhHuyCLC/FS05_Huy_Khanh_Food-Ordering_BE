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
    { name: "Mì Quảng Bà Mua", desc: "Đậm đà hương vị Mì Quảng chính gốc", address: "95A Nguyễn Tri Phương, Hải Châu, Đà Nẵng", lat: 16.0617, lng: 108.2120, img: "https://loremflickr.com/800/600/noodle,vietnam?random=1" },
    { name: "Bánh Xèo Bà Dưỡng", desc: "Bánh xèo giòn rụm, nem lụi thơm ngon", address: "K280/23 Hoàng Diệu, Hải Châu, Đà Nẵng", lat: 16.0594, lng: 108.2154, img: "https://loremflickr.com/800/600/pancake,vietnam?random=2" },
    { name: "Hải Sản Năm Rảnh", desc: "Hải sản tươi sống, giá cả bình dân", address: "71 Chương Dương, Ngũ Hành Sơn, Đà Nẵng", lat: 16.0460, lng: 108.2396, img: "https://loremflickr.com/800/600/seafood,vietnam?random=3" },
    { name: "Cơm Tấm Sài Gòn", desc: "Cơm tấm sườn bì chả truyền thống", address: "145 Nguyễn Văn Linh, Hải Châu, Đà Nẵng", lat: 16.0613, lng: 108.2109, img: "https://loremflickr.com/800/600/rice,meat?random=4" },
    { name: "Bún Bò Bà Diệu", desc: "Bún bò Huế cay nồng hấp dẫn", address: "17 Trần Tống, Thanh Khê, Đà Nẵng", lat: 16.0619, lng: 108.2045, img: "https://loremflickr.com/800/600/noodle,beef?random=5" },
    { name: "Trà Sữa Gong Cha", desc: "Trà sữa trân châu chuẩn vị Đài Loan", address: "225 Nguyễn Văn Linh, Thanh Khê, Đà Nẵng", lat: 16.0607, lng: 108.2078, img: "https://loremflickr.com/800/600/boba,milktea?random=6" },
    { name: "Highlands Coffee", desc: "Cà phê pha phin truyền thống", address: "74 Bạch Đằng, Hải Châu, Đà Nẵng", lat: 16.0711, lng: 108.2241, img: "https://loremflickr.com/800/600/coffee,cafe?random=7" },
    { name: "Bánh Tráng Cuốn Thịt Heo Trần", desc: "Đặc sản Đà Nẵng", address: "4 Lê Duẩn, Hải Châu, Đà Nẵng", lat: 16.0722, lng: 108.2227, img: "https://loremflickr.com/800/600/pork,roll,vietnam?random=8" },
    { name: "Phở 29", desc: "Phở bò Hà Nội truyền thống", address: "35 Trần Quốc Toản, Hải Châu, Đà Nẵng", lat: 16.0682, lng: 108.2226, img: "https://loremflickr.com/800/600/pho,noodle,vietnam?random=9" },
    { name: "Bánh Mì Phượng", desc: "Bánh mì nướng thịt xíu thơm phức", address: "80 Nguyễn Thái Học, Hải Châu, Đà Nẵng", lat: 16.0700, lng: 108.2220, img: "https://loremflickr.com/800/600/banhmi,bread,vietnam?random=10" },
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
        rating: new Prisma.Decimal(4.5 + Math.random() * 0.5),
      },
    });
  }

  console.log("✅ Restaurants seeded");
}