-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('pending', 'converted', 'abandoned');

-- CreateTable
CREATE TABLE "Checkout" (
    "id" SERIAL NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "recoveryUrl" TEXT,
    "cartValue" DOUBLE PRECISION,
    "currency" TEXT,
    "status" "CheckoutStatus" NOT NULL DEFAULT 'pending',
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "email" TEXT,
    "totalPrice" DOUBLE PRECISION,
    "currency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "shopifyCustomerId" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Checkout_checkoutId_key" ON "Checkout"("checkoutId");

-- CreateIndex
CREATE INDEX "Checkout_email_idx" ON "Checkout"("email");

-- CreateIndex
CREATE INDEX "Checkout_status_createdAt_idx" ON "Checkout"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderId_key" ON "Order"("orderId");

-- CreateIndex
CREATE INDEX "Order_email_idx" ON "Order"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_shopifyCustomerId_key" ON "Customer"("shopifyCustomerId");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");
