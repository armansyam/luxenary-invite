-- Penanda pemenuhan layanan setelah PAID (upgrade, perpanjangan galeri, top-up kuota, bundle).
-- Tanpa penanda ini, kegagalan pemenuhan setelah order berstatus PAID tidak dapat diulang dengan aman:
-- pemenuhan bundle menambah kuota secara kumulatif sehingga eksekusi ganda melipatgandakan add-on.
ALTER TABLE "orders" ADD COLUMN "fulfilledAt" TIMESTAMP(3);

-- Order yang sudah PAID sebelum kolom ini ada dianggap sudah terpenuhi (pemenuhan lama berjalan sinkron dengan pelunasan).
UPDATE "orders" SET "fulfilledAt" = COALESCE("paidAt", "createdAt") WHERE "status" = 'PAID';
