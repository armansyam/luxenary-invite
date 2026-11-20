-- Tautkan pengeluaran pencairan komisi ke mitra terkait agar riwayat & bukti transfer mendukung pencairan penuh maupun sebagian.
ALTER TABLE "expenses" ADD COLUMN "partnerAffiliateId" TEXT;
CREATE INDEX "expenses_partnerAffiliateId_idx" ON "expenses"("partnerAffiliateId");
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_partnerAffiliateId_fkey"
  FOREIGN KEY ("partnerAffiliateId") REFERENCES "partner_affiliates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill pencairan lama yang sudah tertaut lewat affiliate_commissions.payoutExpenseId.
UPDATE "expenses" e
SET "partnerAffiliateId" = c."partnerId"
FROM (
  SELECT DISTINCT ON ("payoutExpenseId") "payoutExpenseId", "partnerId"
  FROM "affiliate_commissions"
  WHERE "payoutExpenseId" IS NOT NULL
) c
WHERE e."id" = c."payoutExpenseId"
  AND e."partnerAffiliateId" IS NULL;
