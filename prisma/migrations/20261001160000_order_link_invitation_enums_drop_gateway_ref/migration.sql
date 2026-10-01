-- 1. orders.linkedOrderId bersifat polimorfik (berisi ID Order ATAU ID Invitation): diganti linkedInvitationId yang ber-FK.
ALTER TABLE "orders" ADD COLUMN "linkedInvitationId" TEXT;

-- Nilai berupa ID Invitation (jalur checkout-bundle, add-on).
UPDATE "orders" o SET "linkedInvitationId" = i."id"
FROM "invitations" i
WHERE o."linkedOrderId" IS NOT NULL AND o."linkedOrderId" = i."id";

-- Nilai berupa ID Order (jalur payments/upgrade): pakai undangan yang memiliki order itu.
UPDATE "orders" o SET "linkedInvitationId" = i."id"
FROM "invitations" i
WHERE o."linkedInvitationId" IS NULL AND o."linkedOrderId" IS NOT NULL AND o."linkedOrderId" = i."orderId";

-- Tautan yang tidak menunjuk undangan mana pun dilepas (sesuai ON DELETE SET NULL); order dasar dikenali lewat orderType, bukan tautan.
ALTER TABLE "orders" DROP COLUMN "linkedOrderId";
CREATE INDEX "orders_linkedInvitationId_idx" ON "orders"("linkedInvitationId");
ALTER TABLE "orders" ADD CONSTRAINT "orders_linkedInvitationId_fkey"
  FOREIGN KEY ("linkedInvitationId") REFERENCES "invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. paymentGatewayRef hanya ditulis, tidak pernah dibaca; muatan webhook lengkap tersimpan di webhook_logs dan persetujuan manual di admin_audit_logs.
ALTER TABLE "orders" DROP COLUMN "paymentGatewayRef";

-- 3. orders.paymentMethod menjadi enum.
CREATE TYPE "PaymentMethod" AS ENUM ('GATEWAY', 'MANUAL_TRANSFER');
DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(DISTINCT "paymentMethod", ', ') INTO bad
  FROM "orders" WHERE "paymentMethod" IS NOT NULL AND "paymentMethod" NOT IN ('GATEWAY', 'MANUAL_TRANSFER');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'orders.paymentMethod berisi nilai di luar GATEWAY/MANUAL_TRANSFER: %. Perbaiki datanya lalu ulangi migrasi.', bad;
  END IF;
END $$;
ALTER TABLE "orders" ALTER COLUMN "paymentMethod" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod" USING "paymentMethod"::"PaymentMethod";
ALTER TABLE "orders" ALTER COLUMN "paymentMethod" SET DEFAULT 'GATEWAY';

-- 4. rsvps.status menjadi enum; bentuk lama dari tema (HADIR, TIDAK_HADIR, RAGU) dinormalkan seperti lib/rsvpStatus.ts.
CREATE TYPE "RsvpStatus" AS ENUM ('hadir', 'tidak', 'ragu');
UPDATE "rsvps" SET "status" = CASE lower(regexp_replace(trim("status"), '[\s-]+', '_', 'g'))
  WHEN 'hadir' THEN 'hadir'
  WHEN 'tidak' THEN 'tidak'
  WHEN 'tidak_hadir' THEN 'tidak'
  WHEN 'ragu' THEN 'ragu'
  WHEN 'ragu_ragu' THEN 'ragu'
  ELSE "status" END;
DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(DISTINCT "status", ', ') INTO bad FROM "rsvps" WHERE "status" NOT IN ('hadir', 'tidak', 'ragu');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'rsvps.status berisi nilai yang tidak dikenali: %. Perbaiki datanya lalu ulangi migrasi.', bad;
  END IF;
END $$;
ALTER TABLE "rsvps" ALTER COLUMN "status" TYPE "RsvpStatus" USING "status"::"RsvpStatus";
