-- Expand-only: menambahkan kolom nullable passwordHash untuk login kata sandi Portal Mitra
ALTER TABLE "partner_affiliates" ADD COLUMN "passwordHash" TEXT;
