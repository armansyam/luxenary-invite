-- lux:contract Penyempurnaan skema pra-rilis (belum ada database klien resmi): menghapus kolom legacy Google OAuth (users.googleId, users.avatarUrl) & kolom duplikat (invitations.liveStreamUrl yang sudah dipindah ke featureSettings.liveStreamYoutubeUrl), mengetatkan tipe enum invitation_drafts.event_type, menambah indeks query panas, unique email mitra, dan CHECK constraint tabel baru.

-- 1. Hapus kolom warisan Google OAuth (sudah 0 referensi di aplikasi)
DROP INDEX IF EXISTS "users_googleId_key";
ALTER TABLE "users"
  DROP COLUMN IF EXISTS "googleId",
  DROP COLUMN IF EXISTS "avatarUrl";

-- 2. Migrasikan nilai liveStreamUrl yang belum ada di featureSettings.liveStreamYoutubeUrl, lalu hapus kolom duplikat
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invitations' AND column_name = 'liveStreamUrl'
  ) THEN
    UPDATE "invitations"
    SET "featureSettings" = jsonb_set(
      COALESCE("featureSettings", '{}'::jsonb),
      '{liveStreamYoutubeUrl}',
      to_jsonb("liveStreamUrl"),
      true
    )
    WHERE "liveStreamUrl" IS NOT NULL
      AND btrim("liveStreamUrl") <> ''
      AND COALESCE("featureSettings"->>'liveStreamYoutubeUrl', '') = '';

    ALTER TABLE "invitations" DROP COLUMN "liveStreamUrl";
  END IF;
END $$;

-- 3. Ubah invitation_drafts.event_type dari TEXT bebas menjadi enum EventType yang ketat
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invitation_drafts'
      AND column_name = 'event_type'
      AND udt_name <> 'EventType'
  ) THEN
    UPDATE "invitation_drafts"
    SET "event_type" = CASE
      WHEN UPPER(btrim("event_type")) IN ('WEDDING', 'PERSONAL', 'EVENT') THEN UPPER(btrim("event_type"))
      ELSE 'WEDDING'
    END;

    ALTER TABLE "invitation_drafts"
      ALTER COLUMN "event_type" TYPE "EventType"
      USING ("event_type"::"EventType");
  END IF;
END $$;

-- 4. Normalisasi email mitra & tegakkan keunikan case-insensitive di level database
UPDATE "partner_affiliates"
SET "email" = NULLIF(LOWER(btrim("email")), '')
WHERE "email" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "partner_affiliates_email_lower_key"
  ON "partner_affiliates" (LOWER("email"))
  WHERE "email" IS NOT NULL;

-- 5. Tambahkan CHECK constraints integritas pada tabel-tabel baru
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_gift_claims_quantity_positive') THEN
    ALTER TABLE "gift_claims"
      ADD CONSTRAINT "chk_gift_claims_quantity_positive" CHECK ("quantity" >= 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_invitation_visits_count_positive') THEN
    ALTER TABLE "invitation_visits"
      ADD CONSTRAINT "chk_invitation_visits_count_positive" CHECK ("visit_count" >= 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_email_otp_tokens_attempts_nonnegative') THEN
    ALTER TABLE "email_otp_tokens"
      ADD CONSTRAINT "chk_email_otp_tokens_attempts_nonnegative" CHECK ("attempts" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_shared_files_size_nonnegative') THEN
    ALTER TABLE "shared_files"
      ADD CONSTRAINT "chk_shared_files_size_nonnegative" CHECK ("size" >= 0);
  END IF;
END $$;

-- 6. Indeks komposit & operasional untuk query produksi bertrafik tinggi
CREATE INDEX IF NOT EXISTS "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");
CREATE INDEX IF NOT EXISTS "orders_status_expiredAt_idx" ON "orders"("status", "expiredAt");
CREATE INDEX IF NOT EXISTS "orders_status_paidAt_idx" ON "orders"("status", "paidAt");
CREATE INDEX IF NOT EXISTS "orders_gatewayTxId_idx" ON "orders"("gatewayTxId");
CREATE INDEX IF NOT EXISTS "media_invitationId_mediaSlot_idx" ON "media"("invitationId", "mediaSlot");
CREATE INDEX IF NOT EXISTS "rsvps_invitationId_is_hidden_respondedAt_idx" ON "rsvps"("invitationId", "is_hidden", "respondedAt");
CREATE INDEX IF NOT EXISTS "guest_memories_invitationId_senderEmail_idx" ON "guest_memories"("invitationId", "senderEmail");
CREATE INDEX IF NOT EXISTS "guest_memories_invitationId_createdAt_idx" ON "guest_memories"("invitationId", "createdAt");
CREATE INDEX IF NOT EXISTS "themes_isActive_eventType_sortOrder_idx" ON "themes"("isActive", "eventType", "sortOrder");
CREATE INDEX IF NOT EXISTS "email_otp_tokens_expires_at_idx" ON "email_otp_tokens"("expires_at");
