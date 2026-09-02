-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "gatewayId" TEXT,
ADD COLUMN     "gatewayTxId" TEXT;

-- CreateIndex
CREATE INDEX "orders_gatewayId_idx" ON "orders"("gatewayId");
