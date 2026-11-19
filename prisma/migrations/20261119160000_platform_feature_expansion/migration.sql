-- Ekspansi fitur platform (Gelombang 1-3): Free Draft, moderasi/balas RSVP, suvenir resepsionis, OTP email, dan Gift Registry.
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "is_free_draft" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "invitations_is_free_draft_createdAt_idx" ON "invitations"("is_free_draft", "createdAt");

ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "souvenir_claimed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "souvenir_claimed_at" TIMESTAMP(3);

ALTER TABLE "rsvps" ADD COLUMN IF NOT EXISTS "is_hidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "rsvps" ADD COLUMN IF NOT EXISTS "reply_message" TEXT;
ALTER TABLE "rsvps" ADD COLUMN IF NOT EXISTS "replied_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "email_otp_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'CLIENT_LOGIN',
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_otp_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "email_otp_tokens_email_purpose_expires_at_idx" ON "email_otp_tokens"("email", "purpose", "expires_at");

CREATE TABLE IF NOT EXISTS "gift_claims" (
    "id" TEXT NOT NULL,
    "invitation_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "guest_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "claimed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_claims_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "gift_claims_invitation_id_item_id_idx" ON "gift_claims"("invitation_id", "item_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gift_claims_invitation_id_fkey'
  ) THEN
    ALTER TABLE "gift_claims" ADD CONSTRAINT "gift_claims_invitation_id_fkey"
      FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
