-- Kuota add-on yang sudah dibayar dan penanda notifikasi kuota disimpan di invitations.featureSettings, kolom yang juga
-- ditulis klien dari studio. Akibatnya route klien perlu penjaga agar kuota tidak dapat diubah sendiri, dan pemenuhan
-- add-on maupun unggahan Momen menulis ulang seluruh JSON sehingga perubahan pengaturan klien di sela waktu itu hilang.
ALTER TABLE "invitations"
  ADD COLUMN "extraMemoriesQuota" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "extraGalleryDays" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "memoriesNotifiedMilestones" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

UPDATE "invitations" AS i
SET
  "extraMemoriesQuota" = CASE
    WHEN jsonb_typeof(s.fs->'extraMemoriesQuota') = 'number' THEN GREATEST(0, floor((s.fs->>'extraMemoriesQuota')::numeric))::int
    ELSE 0
  END,
  "extraGalleryDays" = CASE
    WHEN jsonb_typeof(s.fs->'extraGalleryDays') = 'number' THEN GREATEST(0, floor((s.fs->>'extraGalleryDays')::numeric))::int
    ELSE 0
  END,
  "memoriesNotifiedMilestones" = CASE
    WHEN jsonb_typeof(s.fs->'memoriesNotifiedMilestones') = 'array' THEN ARRAY(
      SELECT DISTINCT e::int FROM jsonb_array_elements_text(s.fs->'memoriesNotifiedMilestones') AS e WHERE e ~ '^[0-9]{1,3}$'
    )
    -- Penanda lama sebelum milestone dinamis: hanya ambang 80%.
    WHEN s.fs->>'memoriesNotified80' = 'true' THEN ARRAY[80]
    ELSE ARRAY[]::INTEGER[]
  END,
  "featureSettings" = (s.fs - 'extraMemoriesQuota' - 'extraGalleryDays' - 'memoriesNotifiedMilestones' - 'memoriesNotified80')::text
FROM (
  SELECT "id", "featureSettings"::jsonb AS fs FROM "invitations"
  WHERE "featureSettings" IS NOT NULL AND jsonb_typeof("featureSettings"::jsonb) = 'object'
) AS s
WHERE i."id" = s."id";

ALTER TABLE "invitations"
  ADD CONSTRAINT "chk_invitations_extra_quota_nonnegative" CHECK ("extraMemoriesQuota" >= 0 AND "extraGalleryDays" >= 0);
