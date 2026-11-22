-- Expand-only migration: Direct WO Client Provisioning + 48h Single-Use Magic Link Activation
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "provisioned_by_partner_id" TEXT;

CREATE INDEX IF NOT EXISTS "users_provisioned_by_partner_id_idx"
ON "users"("provisioned_by_partner_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_provisioned_by_partner_id_fkey'
  ) THEN
    ALTER TABLE "users"
    ADD CONSTRAINT "users_provisioned_by_partner_id_fkey"
    FOREIGN KEY ("provisioned_by_partner_id")
    REFERENCES "partner_affiliates"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "client_activation_tokens" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "partner_id" TEXT,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "email_sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "client_activation_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "client_activation_tokens_token_hash_key"
ON "client_activation_tokens"("token_hash");

CREATE INDEX IF NOT EXISTS "client_activation_tokens_user_id_consumed_at_idx"
ON "client_activation_tokens"("user_id", "consumed_at");

CREATE INDEX IF NOT EXISTS "client_activation_tokens_expires_at_idx"
ON "client_activation_tokens"("expires_at");

CREATE INDEX IF NOT EXISTS "client_activation_tokens_partner_id_idx"
ON "client_activation_tokens"("partner_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_activation_tokens_user_id_fkey'
  ) THEN
    ALTER TABLE "client_activation_tokens"
    ADD CONSTRAINT "client_activation_tokens_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_activation_tokens_partner_id_fkey'
  ) THEN
    ALTER TABLE "client_activation_tokens"
    ADD CONSTRAINT "client_activation_tokens_partner_id_fkey"
    FOREIGN KEY ("partner_id")
    REFERENCES "partner_affiliates"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
