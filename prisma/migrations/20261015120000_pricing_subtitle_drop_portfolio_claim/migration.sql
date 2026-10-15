-- Subjudul harga beranda menjanjikan "portofolio resmi permanen" kepada setiap klien, padahal portofolio hanya berisi
-- undangan yang dipilih dan disalin admin. Klausa dihapus dari nilai bawaan; nilai yang sudah diedit admin tidak disentuh.
UPDATE "admin_settings"
SET "value" = 'Biaya satu kali bayar dengan masa aktif undangan {{archiveRetention}} (archive) dan penyimpanan galeri foto tamu {{galleryRetention}}.'
WHERE "key" = 'pricing_subtitle'
  AND "value" = 'Biaya satu kali bayar dengan masa aktif undangan {{archiveRetention}} (archive), penyimpanan galeri foto tamu {{galleryRetention}}, dan portofolio resmi permanen.';
