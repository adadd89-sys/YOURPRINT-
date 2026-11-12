import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

export function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to connect to the YOURPRINT database");
  }

  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

// Do not cache PrismaClient in the Worker isolate: Neon I/O objects are request-scoped.
// Routes should create one client per incoming request and pass it to their helpers.
export const prisma = createPrismaClient();
