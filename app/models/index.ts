import env from "@configs/env";
import { PrismaClient } from "@db";

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const prismaClientSingleton = () => {
  const pool = new pg.Pool({
    connectionString: env.databaseUrl,
  });

  const adapter = new PrismaPg(pool);

import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = env.databaseUrl;

const adapter = new PrismaPg({
  connectionString,
});

const prismaClientSingleton = () => {
  return new PrismaClient({
    adapter,
    log:
      env.nodeEnv === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
};

type PrismaClientSingleton =
  ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const models =
  globalForPrisma.prisma ??
  prismaClientSingleton();

export default models;

if (env.nodeEnv !== "production") {
  globalForPrisma.prisma = models;
}