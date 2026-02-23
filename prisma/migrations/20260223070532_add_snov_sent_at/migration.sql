-- AlterTable
ALTER TABLE "Checkout" ADD COLUMN     "snovSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "snovSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "snovSentAt" TIMESTAMP(3);
