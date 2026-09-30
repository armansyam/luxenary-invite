-- Kolom tidak pernah ditulis; masa aktif dihitung dari acara utama (lib/lifecycleDates.ts).
ALTER TABLE "invitations" DROP COLUMN "expiresAt";

-- Kunci pengaturan lama yang tidak lagi dibaca kode mana pun.
DELETE FROM "admin_settings"
WHERE "key" IN ('retention_gallery_default_days', 'retention_invitation_grace_days', 'retention_account_days');

-- Bawaan seed custom domain (30) tidak pernah ditegakkan; kini 365 hari mengikuti gerbang slug.
UPDATE "admin_settings" SET "value" = '365'
WHERE "key" = 'retention_custom_domain_days' AND "value" = '30';

-- Frasa paket bawaan seed dijadikan token yang mengikuti pengaturan admin.
UPDATE "admin_settings"
SET "value" = replace("value", 'Masa aktif undangan 1 tahun (archive)', 'Masa aktif undangan {{archiveRetention}} (archive)')
WHERE "key" LIKE 'features_tier%';

UPDATE "admin_settings"
SET "value" = replace("value", 'Penyimpanan galeri foto tamu 30 hari (unduh ZIP)', 'Penyimpanan galeri foto tamu {{galleryRetention}} (unduh ZIP)')
WHERE "key" LIKE 'features_tier%';
