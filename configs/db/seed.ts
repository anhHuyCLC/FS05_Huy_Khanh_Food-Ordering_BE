import models from "@models";
import { seedFeatures } from "./seeders/features";
import { seedAdminUser } from "./seeders/seedAdminUser";
import { seedRestaurantReview } from "./seeders/seedReviews";
import { seedNotifications } from "./seeders/seedNotifications";
import { seedMessages } from "./seeders/seedMessages";
import { seedConversation } from "./seeders/seedConversations";
import { seedPromotions } from "./seeders/seedPromotions";
import { seedPayments } from "./seeders/seedPayments";
import { seedOrders } from "./seeders/seedOrders";
import { seedMenuItems } from "./seeders/seedMenuItems";
import { seedCategories } from "./seeders/seedCategories";
import { seedRestaurants } from "./seeders/seedRestaurants";
import { seedProfiles } from "./seeders/seedProfiles";
import { seedDriverProfiles } from "./seeders/seedDriverProfiles";
import { seedOptionChoices } from "./seeders/seedOptionChoices";
import { seedDriverLocations } from "./seeders/seedDriverLocations";
import { seedWalletTransactions } from "./seeders/seedWalletTransactions";
import { seedDriverReviews } from "./seeders/seedDriverReviews";
import { seedPostInteractions } from "./seeders/seedPostInteractions";
import { seedSocialPosts } from "./seeders/seedSocialPosts";
import { seedChatbotSessions } from "./seeders/seedChatbotSessions";
import { seedCartItems } from "./seeders/seedCartItems";
import { seedOrderStatusHistories } from "./seeders/seedOrderStatusHistories";
import { seedOptionGroups } from "./seeders/seedOptionGroups";
import { seedCarts } from "./seeders/seedCarts";
import { seedMenuItemReviews } from "./seeders/seedMenuItemReviews";
import { seedOrderItems } from "./seeders/seedOrderItems";
import { seedFavorites } from "./seeders/seedFavorites";



async function seed() {
  await seedFeatures();
  await seedAdminUser();

  console.log("🧹 Cleaning existing seed data...");
  await models.orderStatusHistory.deleteMany({});
  await models.payment.deleteMany({});
  await models.walletTransaction.deleteMany({});
  await models.orderItem.deleteMany({});
  await models.order.deleteMany({});
  await models.cartItem.deleteMany({});
  await models.cart.deleteMany({});
  await models.driverLocation.deleteMany({});
  await models.driverReview.deleteMany({});
  await models.restaurantReview.deleteMany({});
  await models.menuItemReview.deleteMany({});
  await models.driverProfile.deleteMany({});
  await models.optionChoice.deleteMany({});
  await models.optionGroup.deleteMany({});
  await models.menuItem.deleteMany({});
  await models.promotion.deleteMany({});
  await models.category.deleteMany({});
  await models.restaurant.deleteMany({});
  await models.postInteraction.deleteMany({});
  await models.postComment.deleteMany({});
  await models.socialPost.deleteMany({});
  await models.message.deleteMany({});
  await models.conversationParticipant.deleteMany({});
  await models.conversation.deleteMany({});
  await models.notification.deleteMany({});
  await models.chatbotSession.deleteMany({});
  await models.savedAddress.deleteMany({});
  await models.favoriteRestaurant.deleteMany({});

  const emails = [
    ...Array.from({ length: 10 }, (_, i) => `user${i + 1}@gmail.com`),
    ...Array.from({ length: 3 }, (_, i) => `customer${i + 1}@gmail.com`),
    ...Array.from({ length: 3 }, (_, i) => `restaurant${i + 1}@gmail.com`),
    ...Array.from({ length: 4 }, (_, i) => `driver${i + 1}@gmail.com`),
  ];
  await models.userToRole.deleteMany({
    where: {
      user: {
        email: { in: emails }
      }
    }
  });
  await models.userToPermission.deleteMany({
    where: {
      user: {
        email: { in: emails }
      }
    }
  });
  await models.password.deleteMany({
    where: {
      user: {
        email: { in: emails }
      }
    }
  });
  await models.profile.deleteMany({
    where: {
      user: {
        email: { in: emails }
      }
    }
  });
  await models.user.deleteMany({
    where: {
      email: { in: emails }
    }
  });

  await seedProfiles();

  await seedDriverProfiles();
  await seedDriverLocations();

  await seedRestaurants();
  await seedFavorites();

  await seedCategories();

  await seedMenuItems();
  
  await seedOptionGroups();
  await seedOptionChoices();

  await seedPromotions();

  await seedCarts();
  await seedCartItems();

  await seedOrders();
  await seedOrderItems();

  await seedPayments();

  await seedWalletTransactions();

  await seedChatbotSessions();

  await seedSocialPosts();
  await seedPostInteractions();

  await seedConversation();
  await seedMessages();

  await seedNotifications();

  await seedRestaurantReview();
  await seedDriverReviews();
  await seedMenuItemReviews();
  
  await seedOrderStatusHistories();




  console.log("Seed data created successfully!");
}
seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await models.$disconnect();
  });
