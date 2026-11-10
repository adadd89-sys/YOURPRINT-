-- Initial YOURPRINT database schema.
-- Generated to match prisma/schema.prisma for a fresh PostgreSQL database.

CREATE TYPE "OrderStatus" AS ENUM (
  'NEW',
  'ACCEPTED',
  'IN_PROGRESS',
  'READY',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "ArtworkType" AS ENUM (
  'READY',
  'CREATE_NEW'
);

CREATE TYPE "UserRole" AS ENUM (
  'CUSTOMER',
  'ADMIN'
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "telegramId" BIGINT NOT NULL,
  "username" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromoCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "discountPct" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "usageLimit" INTEGER,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "number" SERIAL NOT NULL,
  "customerId" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
  "artworkType" "ArtworkType" NOT NULL,
  "description" TEXT,
  "deadline" TIMESTAMP(3),
  "totalPrice" DECIMAL(10,2),
  "promoCodeId" TEXT,
  "completionFileId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "size" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderFile" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "telegramFileId" TEXT,
  "fileUrl" TEXT,
  "fileName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderStatusEvent" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "changedById" TEXT,
  "fromStatus" "OrderStatus",
  "toStatus" "OrderStatus" NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");
CREATE INDEX "Order_status_deadline_idx" ON "Order"("status", "deadline");
CREATE INDEX "OrderStatusEvent_orderId_createdAt_idx" ON "OrderStatusEvent"("orderId", "createdAt");

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_promoCodeId_fkey"
  FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderFile"
  ADD CONSTRAINT "OrderFile_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderStatusEvent"
  ADD CONSTRAINT "OrderStatusEvent_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderStatusEvent"
  ADD CONSTRAINT "OrderStatusEvent_changedById_fkey"
  FOREIGN KEY ("changedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
