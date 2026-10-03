-- Kolom yang tidak dibaca kode mana pun: sisa fitur yang tidak pernah selesai atau sudah diganti.
--   themes.previewUrl          URL pratinjau dihitung saat respons (/demo/<id>), bukan dibaca dari kolom.
--   promo_coupons.isSingleUse  selalu ditulis false oleh form admin dan tidak pernah dievaluasi saat validasi kupon
--                              (batas pemakaian ditegakkan lewat perUserLimit dan quotaLimit).
--   guests.waSentAt            hanya ditulis lewat API tamu, tidak pernah ditampilkan atau dipakai filter.
ALTER TABLE "themes" DROP COLUMN "previewUrl";
ALTER TABLE "promo_coupons" DROP COLUMN "isSingleUse";
ALTER TABLE "guests" DROP COLUMN "waSentAt";
