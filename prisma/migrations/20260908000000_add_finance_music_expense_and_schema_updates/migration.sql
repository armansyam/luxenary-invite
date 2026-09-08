-- Migration: 20260908000000_add_finance_music_expense_and_schema_updates
-- Sinkronisasi schema Prisma dengan database.

-- 1. ENUM CHANGES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'AdminRole' AND e.enumlabel = 'ADMIN') THEN
    ALTER TYPE "AdminRole" ADD VALUE 'ADMIN';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'InvitationStatus' AND e.enumlabel = 'EVENT_FINISHED') THEN
    ALTER TYPE "InvitationStatus" ADD VALUE 'EVENT_FINISHED';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'OrderType' AND e.enumlabel = 'GALLERY_EXTENSION') THEN
    ALTER TYPE "OrderType" ADD VALUE 'GALLERY_EXTENSION';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'OrderType' AND e.enumlabel = 'CUSTOM_DOMAIN_ADDON') THEN
    ALTER TYPE "OrderType" ADD VALUE 'CUSTOM_DOMAIN_ADDON';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExpenseCategory') THEN
    CREATE TYPE "ExpenseCategory" AS ENUM ('INFRASTRUCTURE','UTILITIES','MARKETING','SOFTWARE_LICENSES','OPERATIONAL','OTHER');
  END IF;
END$$;

-- 2. KOLOM BARU DI TABEL YANG SUDAH ADA
ALTER TABLE "invitations"
  ADD COLUMN IF NOT EXISTS "groomFather"      TEXT,
  ADD COLUMN IF NOT EXISTS "groomMother"      TEXT,
  ADD COLUMN IF NOT EXISTS "brideFather"      TEXT,
  ADD COLUMN IF NOT EXISTS "brideMother"      TEXT,
  ADD COLUMN IF NOT EXISTS "galleryExpiresAt" TIMESTAMP(3);

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "requestedDomain" TEXT;
ALTER TABLE "users"  ADD COLUMN IF NOT EXISTS "passwordHash"    TEXT;

-- 3. TABEL BARU: music_presets
CREATE TABLE IF NOT EXISTS "music_presets" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "composer"    TEXT,
    "genre"       TEXT,
    "url"         TEXT NOT NULL,
    "durationSec" INTEGER DEFAULT 0,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "music_presets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "music_presets_url_key" ON "music_presets"("url");

-- 4. TABEL BARU: expenses
CREATE TABLE IF NOT EXISTS "expenses" (
    "id"              TEXT NOT NULL,
    "title"           TEXT NOT NULL,
    "category"        "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "amount"          DECIMAL(12,2) NOT NULL,
    "expenseDate"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentSource"   TEXT DEFAULT 'TRANSFER_BANK',
    "referenceNumber" TEXT,
    "receiptUrl"      TEXT,
    "notes"           TEXT,
    "createdById"     TEXT,
    "isLocked"        BOOLEAN NOT NULL DEFAULT false,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "expenses_category_idx" ON "expenses"("category");
CREATE INDEX IF NOT EXISTS "expenses_expenseDate_idx" ON "expenses"("expenseDate");

-- 5. TABEL BARU: recurring_expenses
CREATE TABLE IF NOT EXISTS "recurring_expenses" (
    "id"              TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "category"        "ExpenseCategory" NOT NULL DEFAULT 'UTILITIES',
    "estimatedAmount" DECIMAL(12,2) NOT NULL,
    "dueDayOfMonth"   INTEGER NOT NULL,
    "vendorName"      TEXT,
    "paymentSource"   TEXT DEFAULT 'TRANSFER_BANK',
    "isActive"        BOOLEAN NOT NULL DEFAULT true,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recurring_expenses_pkey" PRIMARY KEY ("id")
);

-- 6. TABEL BARU: financial_closings
CREATE TABLE IF NOT EXISTS "financial_closings" (
    "id"            TEXT NOT NULL,
    "periodMonth"   INTEGER NOT NULL,
    "periodYear"    INTEGER NOT NULL,
    "grossRevenue"  DECIMAL(12,2) NOT NULL,
    "totalExpenses" DECIMAL(12,2) NOT NULL,
    "netProfit"     DECIMAL(12,2) NOT NULL,
    "taxAmount"     DECIMAL(12,2) NOT NULL,
    "taxPaid"       BOOLEAN NOT NULL DEFAULT false,
    "taxPaidAt"     TIMESTAMP(3),
    "closedById"    TEXT NOT NULL,
    "closedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes"         TEXT,
    CONSTRAINT "financial_closings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "financial_closings_periodMonth_periodYear_key" ON "financial_closings"("periodMonth","periodYear");
