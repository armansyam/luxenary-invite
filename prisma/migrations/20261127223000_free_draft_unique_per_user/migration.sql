-- Tegakkan maksimal 1 Draf Gratis aktif per akun klien di tingkat database.
-- Bersihkan lebih dulu bila ada duplikat historis akibat race condition (pertahankan draf terbaru per userId).
DELETE FROM "invitations"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt" DESC, "id" DESC) AS rn
    FROM "invitations"
    WHERE "is_free_draft" = true AND "orderId" IS NULL
  ) ranked
  WHERE ranked.rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "invitations_one_free_draft_per_user_idx"
  ON "invitations" ("userId")
  WHERE "is_free_draft" = true;
