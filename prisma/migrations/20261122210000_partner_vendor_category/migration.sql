-- Expand-only migration: Dynamic vendor category on partner_affiliates
ALTER TABLE "partner_affiliates"
ADD COLUMN IF NOT EXISTS "vendor_category" TEXT;

CREATE INDEX IF NOT EXISTS "partner_affiliates_vendor_category_idx"
ON "partner_affiliates"("vendor_category");
