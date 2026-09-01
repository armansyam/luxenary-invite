/*
  Warnings:

  - You are about to drop the `invitation_media` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `guestLimit` on the `guests` table. All the data in the column will be lost.
  - You are about to drop the column `driveAccessToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `driveRefreshToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `driveTokenExpiry` on the `users` table. All the data in the column will be lost.
  - Added the required column `slug` to the `guests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN "paymentMethod" TEXT DEFAULT 'GATEWAY';
ALTER TABLE "orders" ADD COLUMN "proofImageUrl" TEXT;
ALTER TABLE "orders" ADD COLUMN "proofUploadedAt" DATETIME;
ALTER TABLE "orders" ADD COLUMN "rejectReason" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "invitation_media";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invitationId" TEXT NOT NULL,
    "mediaSlot" TEXT NOT NULL,
    "driveFileId" TEXT,
    "driveViewUrl" TEXT,
    "localPath" TEXT,
    "mimeType" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "wishes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invitationId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wishes_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "guest_memories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invitationId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "message" TEXT,
    "mediaType" TEXT NOT NULL DEFAULT 'PHOTO',
    "mediaUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "driveFileId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guest_memories_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_guests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invitationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "phone" TEXT,
    "phoneNumber" TEXT,
    "guestQuota" INTEGER NOT NULL DEFAULT 1,
    "tableNumber" TEXT,
    "waStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "waSentAt" DATETIME,
    "qrToken" TEXT,
    "isTokenRedeemed" BOOLEAN NOT NULL DEFAULT false,
    "videoWishUrl" TEXT,
    "videoRecordedAt" DATETIME,
    "sessionInfo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guests_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_guests" ("category", "createdAt", "id", "invitationId", "name", "phone", "qrToken", "sessionInfo", "waStatus") SELECT "category", "createdAt", "id", "invitationId", "name", "phone", "qrToken", "sessionInfo", "waStatus" FROM "guests";
DROP TABLE "guests";
ALTER TABLE "new_guests" RENAME TO "guests";
CREATE UNIQUE INDEX "guests_qrToken_key" ON "guests"("qrToken");
CREATE UNIQUE INDEX "guests_invitationId_slug_key" ON "guests"("invitationId", "slug");
CREATE TABLE "new_invitations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT,
    "userId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL DEFAULT 'kila',
    "subdomain" TEXT,
    "customDomain" TEXT,
    "invitationSlug" TEXT NOT NULL,
    "groomSlug" TEXT NOT NULL,
    "brideSlug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" DATETIME,
    "expiresAt" DATETIME,
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
    "groomInstagram" TEXT,
    "brideName" TEXT,
    "brideNickname" TEXT,
    "brideParents" TEXT,
    "brideInstagram" TEXT,
    "liveStreamUrl" TEXT,
    "isLockedPermanently" BOOLEAN NOT NULL DEFAULT false,
    "adminUnlockedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "invitations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "invitations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_invitations" ("bankAccounts", "brideInstagram", "brideName", "brideNickname", "brideParents", "brideSlug", "createdAt", "dresscode", "eventData", "featureSettings", "groomInstagram", "groomName", "groomNickname", "groomParents", "groomSlug", "id", "invitationSlug", "liveStreamUrl", "loveStory", "openingQuote", "openingQuoteRef", "orderId", "publishedAt", "shippingAddress", "status", "subdomain", "themeId", "updatedAt", "userId") SELECT "bankAccounts", "brideInstagram", "brideName", "brideNickname", "brideParents", "brideSlug", "createdAt", "dresscode", "eventData", "featureSettings", "groomInstagram", "groomName", "groomNickname", "groomParents", "groomSlug", "id", "invitationSlug", "liveStreamUrl", "loveStory", "openingQuote", "openingQuoteRef", "orderId", "publishedAt", "shippingAddress", "status", "subdomain", "themeId", "updatedAt", "userId" FROM "invitations";
DROP TABLE "invitations";
ALTER TABLE "new_invitations" RENAME TO "invitations";
CREATE UNIQUE INDEX "invitations_orderId_key" ON "invitations"("orderId");
CREATE UNIQUE INDEX "invitations_subdomain_key" ON "invitations"("subdomain");
CREATE UNIQUE INDEX "invitations_customDomain_key" ON "invitations"("customDomain");
CREATE UNIQUE INDEX "invitations_groomSlug_brideSlug_invitationSlug_key" ON "invitations"("groomSlug", "brideSlug", "invitationSlug");
CREATE TABLE "new_rsvps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invitationId" TEXT NOT NULL,
    "guestId" TEXT,
    "guestName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT,
    "respondedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rsvps_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rsvps_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_rsvps" ("guestCount", "guestId", "guestName", "id", "invitationId", "message", "respondedAt", "status") SELECT "guestCount", "guestId", "guestName", "id", "invitationId", "message", "respondedAt", "status" FROM "rsvps";
DROP TABLE "rsvps";
ALTER TABLE "new_rsvps" RENAME TO "rsvps";
CREATE TABLE "new_themes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "category" TEXT NOT NULL DEFAULT 'luxury',
    "series" TEXT,
    "previewUrl" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_themes" ("createdAt", "description", "id", "isActive", "isPremium", "name", "previewUrl", "series", "sortOrder") SELECT "createdAt", "description", "id", "isActive", "isPremium", "name", "previewUrl", "series", "sortOrder" FROM "themes";
DROP TABLE "themes";
ALTER TABLE "new_themes" RENAME TO "themes";
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "googleId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "phoneNumber" TEXT,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_users" ("avatarUrl", "createdAt", "email", "googleId", "id", "name", "role") SELECT "avatarUrl", "createdAt", "email", "googleId", "id", "name", "role" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");
