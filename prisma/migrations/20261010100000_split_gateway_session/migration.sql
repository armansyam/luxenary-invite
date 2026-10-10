-- orders.snapToken menyimpan dua bentuk dalam satu kolom teks: JSON sesi QRIS {qrString, sessionId, expiry} atau URL
-- checkout (Snap/Xendit Invoice). Kedaluwarsa sesi lalu ditulis ke expiredAt, menimpa batas hidup order 24 jam,
-- sehingga order ikut kedaluwarsa bersama QR dan QR tidak pernah dapat diterbitkan ulang. Sesi gateway kini punya
-- kolomnya sendiri; sessionId sama dengan gatewayTxId sehingga tidak disimpan ulang.
ALTER TABLE "orders"
  ADD COLUMN "gatewayQrString" TEXT,
  ADD COLUMN "gatewayCheckoutUrl" TEXT,
  ADD COLUMN "gatewaySessionExpiresAt" TIMESTAMP(3);

DO $$
DECLARE
  r RECORD;
  session JSONB;
BEGIN
  FOR r IN SELECT "id", "snapToken" FROM "orders" WHERE "snapToken" IS NOT NULL LOOP
    IF r."snapToken" LIKE 'http%' THEN
      UPDATE "orders" SET "gatewayCheckoutUrl" = r."snapToken" WHERE "id" = r."id";
    ELSE
      BEGIN
        session := r."snapToken"::jsonb;
        UPDATE "orders"
          SET "gatewayQrString" = session->>'qrString',
              "gatewaySessionExpiresAt" = CASE
                WHEN jsonb_typeof(session->'expiry') = 'number' THEN to_timestamp((session->>'expiry')::double precision / 1000) AT TIME ZONE 'UTC'
              END
          WHERE "id" = r."id";
      EXCEPTION WHEN invalid_text_representation THEN
        -- Isi yang bukan JSON maupun URL tidak dapat dipakai untuk melanjutkan sesi; sesi baru diterbitkan saat dibayar.
        NULL;
      END;
    END IF;
  END LOOP;
END $$;

ALTER TABLE "orders" DROP COLUMN "snapToken";
