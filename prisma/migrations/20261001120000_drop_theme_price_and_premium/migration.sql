-- Tema tidak lagi berharga atau berlabel premium: paket dibedakan oleh fitur, semua tema terbuka untuk semua paket.
ALTER TABLE "themes" DROP COLUMN "isPremium",
DROP COLUMN "price";
