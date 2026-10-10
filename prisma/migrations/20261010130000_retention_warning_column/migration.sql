-- Penanda email peringatan retensi galeri ditulis cron ke invitations.featureSettings (kolom yang juga ditulis klien),
-- dengan menulis ulang seluruh JSON. Kini kolom sendiri.
ALTER TABLE "invitations" ADD COLUMN "retentionWarningSentAt" TIMESTAMP(3);

UPDATE "invitations"
SET
  "retentionWarningSentAt" = CASE
    WHEN "featureSettings"->>'retentionWarningSentAt' ~ '^\d{4}-\d{2}-\d{2}T' THEN ("featureSettings"->>'retentionWarningSentAt')::timestamptz AT TIME ZONE 'UTC'
  END,
  "featureSettings" = "featureSettings" - 'retentionWarningSentAt'
WHERE "featureSettings" ? 'retentionWarningSentAt';
