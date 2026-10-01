-- Integritas data: tipe uang konsisten, FK tema dan pengeluaran payout, indeks FK, buang kolom mati.

-- orders.amount satu-satunya kolom uang bertipe numeric(65,30); seragamkan dengan kolom uang lain.
ALTER TABLE "orders" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- themes.isFeatured tidak dibaca maupun ditulis kode mana pun (isFeatured milik paket ada di admin_settings).
ALTER TABLE "themes" DROP COLUMN "isFeatured";

CREATE INDEX "affiliate_commissions_payoutExpenseId_idx" ON "affiliate_commissions"("payoutExpenseId");
-- Produksi memiliki versi parsial (WHERE "guestId" IS NOT NULL) dari migrasi hardening lama yang sudah dipadatkan ke baseline; ganti dengan indeks penuh sesuai skema.
DROP INDEX IF EXISTS "rsvps_guestId_idx";
CREATE INDEX "rsvps_guestId_idx" ON "rsvps"("guestId");

-- Referensi payout yatim dinolkan agar sesuai semantik ON DELETE SET NULL.
UPDATE "affiliate_commissions" c SET "payoutExpenseId" = NULL
WHERE c."payoutExpenseId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "expenses" e WHERE e."id" = c."payoutExpenseId");

-- Undangan yang menunjuk tema yang tidak ada tidak bisa diperbaiki otomatis (tema pengganti tidak bisa ditebak).
DO $$
DECLARE orphan_list text;
BEGIN
  SELECT string_agg(DISTINCT i."themeId", ', ') INTO orphan_list
  FROM "invitations" i
  WHERE NOT EXISTS (SELECT 1 FROM "themes" t WHERE t."id" = i."themeId");
  IF orphan_list IS NOT NULL THEN
    RAISE EXCEPTION 'invitations.themeId merujuk tema yang tidak ada di tabel themes: %. Jalankan npm run themes:sync atau perbaiki themeId lalu ulangi migrasi.', orphan_list;
  END IF;
END $$;

ALTER TABLE "invitations" ADD CONSTRAINT "invitations_themeId_fkey"
  FOREIGN KEY ("themeId") REFERENCES "themes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_payoutExpenseId_fkey"
  FOREIGN KEY ("payoutExpenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
