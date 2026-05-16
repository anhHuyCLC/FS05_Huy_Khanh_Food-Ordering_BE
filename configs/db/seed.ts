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



async function seed() {
  await seedFeatures();
  await seedAdminUser();

  await seedProfiles();

  await seedDriverProfiles();
  await seedDriverLocations();

  await seedRestaurants();

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
