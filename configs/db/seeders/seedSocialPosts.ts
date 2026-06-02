import models from "@models";

export async function seedSocialPosts() {
  console.log("🌱 Seeding social posts...");

  const profiles = await models.profile.findMany();
  const restaurants = await models.restaurant.findMany();

  const tags = [
    ["#RamenNgon", "#HealthyEats"],
    ["#BurgerRepublic", "#FastFood"],
    ["#BuddhaBowl", "#HealthyEats", "#CleanEating"],
    ["#TiramisuLovers", "#DessertDreams"],
    ["#PhoGiaTruyen", "#VietnameseFood"],
    ["#BunBoHue", "#VietnameseFood", "#RamenNgon"],
    ["#DessertDreams", "#SweetTooth"],
    ["#HealthyEats", "#SaladBowl"],
    ["#BurgerRepublic", "#CheatDay"],
    ["#PhoGiaTruyen", "#PhoVietNam"]
  ];

  for (let i = 0; i < 10; i++) {
    const post = await models.socialPost.create({
      data: {
        userId: profiles[i % profiles.length].id,
        restaurantId: restaurants[i % restaurants.length].id,
        content: `Món ăn tuyệt vời tại nhà hàng này! Rất đáng thử nhé mọi người. ${tags[i % tags.length].join(" ")}`,
        mediaUrls: [
          `https://picsum.photos/500/500?random=${i}`,
        ],
        taggedItems: [],
        likesCount: 100 + i,
        commentsCount: 2,
      },
    });

    // Create comments for the post
    await models.postComment.create({
      data: {
        postId: post.id,
        userId: profiles[(i + 1) % profiles.length].id,
        content: `Tôi cũng rất thích món ăn ở đây! Thật tuyệt vời. (Bài số ${i})`,
      }
    });

    await models.postComment.create({
      data: {
        postId: post.id,
        userId: profiles[(i + 2) % profiles.length].id,
        content: `Nhìn ngon quá, hôm nào phải ghé thử mới được!`,
      }
    });
  }

  console.log("✅ Social posts seeded");
}