-- Subjudul harga beranda menuliskan masa simpan sebagai angka mati ("1 tahun", "30 hari") yang tidak ikut berubah saat
-- admin mengatur nas_archive_retention_days / retention_cleanup_days. Hanya nilai bawaan yang belum diedit admin diganti
-- token yang dirender dari pengaturan berlaku (lib/settings.ts, resolveRetentionTokens).
UPDATE "admin_settings"
SET "value" = 'Biaya satu kali bayar dengan masa aktif undangan {{archiveRetention}} (archive), penyimpanan galeri foto tamu {{galleryRetention}}, dan portofolio resmi permanen.'
WHERE "key" = 'pricing_subtitle'
  AND "value" = 'Biaya satu kali bayar dengan masa aktif undangan 1 tahun (archive), penyimpanan galeri foto tamu 30 hari, dan portofolio resmi permanen.';
