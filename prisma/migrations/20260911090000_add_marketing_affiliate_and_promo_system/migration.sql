-- Migration: 20260911090000_add_marketing_affiliate_and_promo_system
-- Menambahkan sistem kupon promo, mitra afiliasi, promo holds, dan komisi

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('NOMINAL', 'PERCENT');
CREATE TYPE "CommissionType" AS ENUM ('NOMINAL', 'PERCENT');
CREATE TYPE "HoldStatus" AS ENUM ('HELD', 'RELEASED', 'CONSUMED');
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PAID');

-- AlterTable Order
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "checkoutConfirmedAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(12,2);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "promoCodeApplied" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "promoCouponId" TEXT;

-- CreateTable partner_affiliates
CREATE TABLE IF NOT EXISTS "partner_affiliates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "email" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "commissionType" "CommissionType" NOT NULL DEFAULT 'PERCENT',
    "commissionValue" DECIMAL(12,2) NOT NULL,
    "pendingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPaidOut" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_affiliates_pkey" PRIMARY KEY ("id")
);

-- CreateTable promo_coupons
CREATE TABLE IF NOT EXISTS "promo_coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "DiscountType" NOT NULL DEFAULT 'NOMINAL',
    "discountValue" DECIMAL(12,2) NOT NULL,
    "minOrderAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "maxDiscountAmount" DECIMAL(12,2),
    "quotaLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isSingleUse" BOOLEAN NOT NULL DEFAULT false,
    "perUserLimit" INTEGER DEFAULT 1,
    "applicablePlans" "PlanType"[] DEFAULT ARRAY[]::"PlanType"[],
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "partnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable promo_holds
CREATE TABLE IF NOT EXISTS "promo_holds" (
    "id" TEXT NOT NULL,
    "promoCode" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "HoldStatus" NOT NULL DEFAULT 'HELD',
    "discountAmount" DECIMAL(12,2) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable affiliate_commissions
CREATE TABLE IF NOT EXISTS "affiliate_commissions" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderAmount" DECIMAL(12,2) NOT NULL,
    "commissionAmount" DECIMAL(12,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "payoutExpenseId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "promo_coupons_code_key" ON "promo_coupons"("code");
CREATE INDEX IF NOT EXISTS "promo_coupons_partnerId_idx" ON "promo_coupons"("partnerId");
CREATE INDEX IF NOT EXISTS "promo_coupons_isActive_idx" ON "promo_coupons"("isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "promo_holds_orderId_key" ON "promo_holds"("orderId");
CREATE INDEX IF NOT EXISTS "promo_holds_promoCode_status_idx" ON "promo_holds"("promoCode", "status");
CREATE INDEX IF NOT EXISTS "promo_holds_userId_promoCode_status_idx" ON "promo_holds"("userId", "promoCode", "status");
CREATE INDEX IF NOT EXISTS "promo_holds_expiresAt_idx" ON "promo_holds"("expiresAt");

CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_commissions_orderId_key" ON "affiliate_commissions"("orderId");
CREATE INDEX IF NOT EXISTS "affiliate_commissions_partnerId_status_idx" ON "affiliate_commissions"("partnerId", "status");

CREATE INDEX IF NOT EXISTS "orders_promoCouponId_idx" ON "orders"("promoCouponId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_promoCouponId_fkey'
  ) THEN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_promoCouponId_fkey" FOREIGN KEY ("promoCouponId") REFERENCES "promo_coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'promo_coupons_partnerId_fkey'
  ) THEN
    ALTER TABLE "promo_coupons" ADD CONSTRAINT "promo_coupons_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner_affiliates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'promo_holds_promoCode_fkey'
  ) THEN
    ALTER TABLE "promo_holds" ADD CONSTRAINT "promo_holds_promoCode_fkey" FOREIGN KEY ("promoCode") REFERENCES "promo_coupons"("code") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'promo_holds_orderId_fkey'
  ) THEN
    ALTER TABLE "promo_holds" ADD CONSTRAINT "promo_holds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'promo_holds_userId_fkey'
  ) THEN
    ALTER TABLE "promo_holds" ADD CONSTRAINT "promo_holds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'affiliate_commissions_partnerId_fkey'
  ) THEN
    ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner_affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'affiliate_commissions_orderId_fkey'
  ) THEN
    ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- Cleanup Stale payment_mode = 'BOTH' -> 'GATEWAY'
UPDATE "admin_settings"
SET "value" = 'GATEWAY', "label" = 'Mode Pembayaran (GATEWAY/MANUAL)'
WHERE "key" = 'payment_mode' AND "value" = 'BOTH';
