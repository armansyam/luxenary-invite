-- Riwayat keuangan dan jejak audit tidak boleh ikut hilang saat akun dihapus.
-- 1. Order tidak lagi terhapus berantai bersama klien: menghapus klien yang masih punya order gagal di tingkat database.
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. Catatan audit bertahan setelah admin pelaku dihapus; nama pelaku disimpan di adminLabel.
ALTER TABLE "admin_audit_logs" ADD COLUMN "adminLabel" TEXT;
ALTER TABLE "admin_audit_logs" ALTER COLUMN "adminId" DROP NOT NULL;
ALTER TABLE "admin_audit_logs" DROP CONSTRAINT "admin_audit_logs_adminId_fkey";
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
