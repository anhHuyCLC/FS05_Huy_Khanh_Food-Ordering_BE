import models from "@models";
import { seedFeatures } from "../seeders/features";

async function run() {
  try {
    console.log("Starting to seed roles...");
    await seedFeatures();
    console.log("Roles seeded successfully!");
  } catch (error) {
    console.error("Error seeding roles:", error);
  } finally {
    await models.$disconnect();
  }
}

run();
