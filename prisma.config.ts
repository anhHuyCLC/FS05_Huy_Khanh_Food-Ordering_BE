import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "app/models/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    url: process.env.DATABASE_URL,  
    url: env("DATABASE_URL"),
  },
});