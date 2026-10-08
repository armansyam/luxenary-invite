-- Status FAILED tidak ditulis lagi sejak ea9595d. Baris lama dipetakan ke cara aplikasi kini menuliskan kejadian yang sama:
-- - Ditolak admin (ada rejectReason): PENDING + rejectReason tanpa bukti, persis hasil route tolak sekarang, sehingga
--   klien dapat mengunggah bukti baru. Penolakan lama tidak menghapus bukti; tanpa dikosongkan, order itu kembali
--   ke antrean verifikasi seolah klien sudah mengunggah ulang.
-- - Gagal di gateway (tanpa rejectReason): EXPIRED, status yang kini ditulis webhook untuk kegagalan gateway.
UPDATE "orders"
  SET "status" = 'PENDING', "proofImageUrl" = NULL, "proofUploadedAt" = NULL
  WHERE "status" = 'FAILED' AND "rejectReason" IS NOT NULL;

UPDATE "orders"
  SET "status" = 'EXPIRED'
  WHERE "status" = 'FAILED';

-- PostgreSQL tidak dapat menghapus satu nilai enum; tipe dibuat ulang tanpa FAILED.
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED');
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus" USING "status"::text::"OrderStatus";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';
DROP TYPE "OrderStatus_old";
