import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaDatabaseHostLogged?: boolean;
};

function getDatabaseUrlHost() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return "missing";
  }

  try {
    return new URL(databaseUrl).host || "missing-host";
  } catch {
    return "invalid";
  }
}

if (!globalForPrisma.prismaDatabaseHostLogged) {
  console.log("DATABASE_URL_HOST", getDatabaseUrlHost());
  globalForPrisma.prismaDatabaseHostLogged = true;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
