import { PrismaClient } from "@prisma/client";

const FALLBACK_URL = "postgresql://127.0.0.1:5432/neondash?schema=public";

const rawUrl = process.env.DATABASE_URL || "";
export const hasDatabase = Boolean(
  rawUrl &&
    !rawUrl.includes("127.0.0.1") &&
    !rawUrl.includes("localhost") &&
    rawUrl !== FALLBACK_URL
);

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = FALLBACK_URL;
  console.warn("[db] DATABASE_URL missing — starting in offline/guest mode");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
