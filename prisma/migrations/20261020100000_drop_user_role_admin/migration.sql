-- Admin tersimpan di tabel admins; users.role hanya pernah bernilai CLIENT. Gagal bila ada baris ADMIN agar tidak dikonversi diam-diam.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "users" WHERE "role" = 'ADMIN') THEN
    RAISE EXCEPTION 'users.role masih berisi ADMIN; pindahkan akun tersebut ke tabel admins sebelum migrasi ini';
  END IF;
END $$;

ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('CLIENT');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::text::"UserRole");
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CLIENT';
DROP TYPE "UserRole_old";
