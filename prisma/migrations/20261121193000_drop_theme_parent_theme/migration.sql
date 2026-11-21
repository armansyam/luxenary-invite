-- Hapus sistem Varian Tema (parentTheme): setiap tema berdiri sendiri dengan berkas master HTML mandiri.
-- lux:contract Penghapusan total Theme Variants (parentTheme) pada rekonstruksi Opsi B; belum ada klien produksi dan seluruh pembaca parentTheme sudah dihapus.
DELETE FROM "themes" WHERE "parentTheme" IS NOT NULL;
ALTER TABLE "themes" DROP COLUMN IF EXISTS "parentTheme";
