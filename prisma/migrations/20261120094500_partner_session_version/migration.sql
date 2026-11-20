-- Expand-only: menambah sessionVersion pada partner_affiliates untuk invalidasi sesi saat reset/ubah sandi atau ganti email mitra.
ALTER TABLE "partner_affiliates" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
