-- AlterEnum
BEGIN;
CREATE TYPE "OrderType_new" AS ENUM ('NEW', 'UPGRADE', 'GALLERY_EXTENSION', 'MEMORIES_TOPUP');
ALTER TABLE "public"."orders" ALTER COLUMN "orderType" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "orderType" TYPE "OrderType_new" USING ("orderType"::text::"OrderType_new");
ALTER TYPE "OrderType" RENAME TO "OrderType_old";
ALTER TYPE "OrderType_new" RENAME TO "OrderType";
DROP TYPE "public"."OrderType_old";
ALTER TABLE "orders" ALTER COLUMN "orderType" SET DEFAULT 'NEW';
COMMIT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "itemsJson" TEXT;
