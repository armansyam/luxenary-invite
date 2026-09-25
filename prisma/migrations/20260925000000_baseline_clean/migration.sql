-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('NEW', 'UPGRADE', 'GALLERY_EXTENSION', 'MEMORIES_TOPUP');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'TAKEN_DOWN', 'ARCHIVED', 'EVENT_FINISHED');

-- CreateEnum
CREATE TYPE "WaStatus" AS ENUM ('PENDING', 'SENT');

-- CreateEnum
CREATE TYPE "MediaSlot" AS ENUM ('LANDING_COVER', 'LANDING_COVER_DESKTOP', 'HOME_PHOTO', 'DESKTOP_SIDEBAR', 'GLOBAL_FIXED_BG', 'GROOM_PHOTO', 'BRIDE_PHOTO', 'GALLERY', 'CLOSING_COVER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('INFRASTRUCTURE', 'UTILITIES', 'MARKETING', 'SOFTWARE_LICENSES', 'OPERATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('NOMINAL', 'PERCENT');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('NOMINAL', 'PERCENT');

-- CreateEnum
CREATE TYPE "HoldStatus" AS ENUM ('HELD', 'RELEASED', 'CONSUMED');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PAID');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'SUPER_ADMIN',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "googleId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "phoneNumber" TEXT,
    "avatarUrl" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "planType" "PlanType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "orderType" "OrderType" NOT NULL DEFAULT 'NEW',
    "upgradedFromPlan" "PlanType",
    "targetPlanType" "PlanType",
    "linkedOrderId" TEXT,
    "paymentMethod" TEXT DEFAULT 'GATEWAY',
    "paymentGatewayRef" TEXT,
    "snapToken" TEXT,
    "proofImageUrl" TEXT,
    "proofUploadedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "checkoutConfirmedAt" TIMESTAMP(3),
    "promoCodeApplied" TEXT,
    "discountAmount" DECIMAL(12,2),
    "promoCouponId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gatewayId" TEXT,
    "gatewayTxId" TEXT,
    "requestedDomain" TEXT,
    "itemsJson" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "userId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL DEFAULT 'kalandra',
    "subdomain" TEXT,
    "customDomain" TEXT,
    "invitationSlug" TEXT NOT NULL,
    "groomSlug" TEXT NOT NULL,
    "brideSlug" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "eventData" TEXT,
    "loveStory" TEXT,
    "bankAccounts" TEXT,
    "shippingAddress" TEXT,
    "featureSettings" TEXT,
    "staffPin" TEXT,
    "openingQuote" TEXT,
    "openingQuoteRef" TEXT,
    "dresscode" TEXT,
    "musicUrl" TEXT,
    "groomName" TEXT,
    "groomNickname" TEXT,
    "groomParents" TEXT,
    "groomFather" TEXT,
    "groomMother" TEXT,
    "groomInstagram" TEXT,
    "brideName" TEXT,
    "brideNickname" TEXT,
    "brideParents" TEXT,
    "brideFather" TEXT,
    "brideMother" TEXT,
    "brideInstagram" TEXT,
    "liveStreamUrl" TEXT,
    "isLockedPermanently" BOOLEAN NOT NULL DEFAULT false,
    "adminUnlockedUntil" TIMESTAMP(3),
    "memoriesUploadLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "galleryExpiresAt" TIMESTAMP(3),

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "mediaSlot" "MediaSlot" NOT NULL,
    "localPath" TEXT,
    "mimeType" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "phone" TEXT,
    "guestQuota" INTEGER NOT NULL DEFAULT 1,
    "tableNumber" TEXT,
    "waStatus" "WaStatus" NOT NULL DEFAULT 'PENDING',
    "waSentAt" TIMESTAMP(3),
    "qrToken" TEXT,
    "isTokenRedeemed" BOOLEAN NOT NULL DEFAULT false,
    "sessionInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rsvps" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "guestId" TEXT,
    "guestName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rsvps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_memories" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "message" TEXT,
    "mediaType" TEXT NOT NULL DEFAULT 'PHOTO',
    "mediaUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT,
    "group" TEXT NOT NULL DEFAULT 'general',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "themes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "category" TEXT NOT NULL DEFAULT 'minimalist',
    "series" TEXT,
    "previewUrl" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "default_music_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "music_presets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "composer" TEXT,
    "genre" TEXT,
    "url" TEXT NOT NULL,
    "durationSec" INTEGER DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "music_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "amount" DECIMAL(12,2) NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentSource" TEXT DEFAULT 'TRANSFER_BANK',
    "referenceNumber" TEXT,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_expenses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'UTILITIES',
    "estimatedAmount" DECIMAL(12,2) NOT NULL,
    "dueDayOfMonth" INTEGER NOT NULL,
    "vendorName" TEXT,
    "paymentSource" TEXT DEFAULT 'TRANSFER_BANK',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_closings" (
    "id" TEXT NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "grossRevenue" DECIMAL(12,2) NOT NULL,
    "totalExpenses" DECIMAL(12,2) NOT NULL,
    "netProfit" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "taxPaid" BOOLEAN NOT NULL DEFAULT false,
    "taxPaidAt" TIMESTAMP(3),
    "closedById" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "financial_closings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_affiliates" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_affiliates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_coupons" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_holds" (
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

-- CreateTable
CREATE TABLE "affiliate_commissions" (
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

-- CreateTable
CREATE TABLE "rate_limit_counters" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "admin_audit_logs_adminId_idx" ON "admin_audit_logs"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "orders_invoiceNumber_key" ON "orders"("invoiceNumber");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_gatewayId_idx" ON "orders"("gatewayId");

-- CreateIndex
CREATE INDEX "orders_promoCouponId_idx" ON "orders"("promoCouponId");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_orderId_key" ON "invitations"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_subdomain_key" ON "invitations"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_customDomain_key" ON "invitations"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_invitationSlug_key" ON "invitations"("invitationSlug");

-- CreateIndex
CREATE INDEX "invitations_userId_idx" ON "invitations"("userId");

-- CreateIndex
CREATE INDEX "invitations_status_idx" ON "invitations"("status");

-- CreateIndex
CREATE INDEX "media_invitationId_idx" ON "media"("invitationId");

-- CreateIndex
CREATE UNIQUE INDEX "guests_qrToken_key" ON "guests"("qrToken");

-- CreateIndex
CREATE INDEX "guests_invitationId_idx" ON "guests"("invitationId");

-- CreateIndex
CREATE UNIQUE INDEX "guests_invitationId_slug_key" ON "guests"("invitationId", "slug");

-- CreateIndex
CREATE INDEX "rsvps_invitationId_idx" ON "rsvps"("invitationId");

-- CreateIndex
CREATE INDEX "guest_memories_invitationId_idx" ON "guest_memories"("invitationId");

-- CreateIndex
CREATE INDEX "webhook_logs_source_createdAt_idx" ON "webhook_logs"("source", "createdAt");

-- CreateIndex
CREATE INDEX "webhook_logs_createdAt_idx" ON "webhook_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "admin_settings_key_key" ON "admin_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "music_presets_url_key" ON "music_presets"("url");

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "expenses"("category");

-- CreateIndex
CREATE INDEX "expenses_expenseDate_idx" ON "expenses"("expenseDate");

-- CreateIndex
CREATE UNIQUE INDEX "financial_closings_periodMonth_periodYear_key" ON "financial_closings"("periodMonth", "periodYear");

-- CreateIndex
CREATE UNIQUE INDEX "promo_coupons_code_key" ON "promo_coupons"("code");

-- CreateIndex
CREATE INDEX "promo_coupons_partnerId_idx" ON "promo_coupons"("partnerId");

-- CreateIndex
CREATE INDEX "promo_coupons_isActive_idx" ON "promo_coupons"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "promo_holds_orderId_key" ON "promo_holds"("orderId");

-- CreateIndex
CREATE INDEX "promo_holds_promoCode_status_idx" ON "promo_holds"("promoCode", "status");

-- CreateIndex
CREATE INDEX "promo_holds_userId_promoCode_status_idx" ON "promo_holds"("userId", "promoCode", "status");

-- CreateIndex
CREATE INDEX "promo_holds_expiresAt_idx" ON "promo_holds"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_commissions_orderId_key" ON "affiliate_commissions"("orderId");

-- CreateIndex
CREATE INDEX "affiliate_commissions_partnerId_status_idx" ON "affiliate_commissions"("partnerId", "status");

-- CreateIndex
CREATE INDEX "idx_rate_limit_expires" ON "rate_limit_counters"("expires_at");

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_promoCouponId_fkey" FOREIGN KEY ("promoCouponId") REFERENCES "promo_coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_memories" ADD CONSTRAINT "guest_memories_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_coupons" ADD CONSTRAINT "promo_coupons_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner_affiliates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_holds" ADD CONSTRAINT "promo_holds_promoCode_fkey" FOREIGN KEY ("promoCode") REFERENCES "promo_coupons"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_holds" ADD CONSTRAINT "promo_holds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_holds" ADD CONSTRAINT "promo_holds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partner_affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
