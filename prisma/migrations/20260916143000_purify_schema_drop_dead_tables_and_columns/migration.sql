-- AlterEnum
BEGIN;
CREATE TYPE "WaStatus_new" AS ENUM ('PENDING', 'SENT');
ALTER TABLE "public"."guests" ALTER COLUMN "waStatus" DROP DEFAULT;
ALTER TABLE "guests" ALTER COLUMN "waStatus" TYPE "WaStatus_new" USING ("waStatus"::text::"WaStatus_new");
ALTER TYPE "WaStatus" RENAME TO "WaStatus_old";
ALTER TYPE "WaStatus_new" RENAME TO "WaStatus";
DROP TYPE "public"."WaStatus_old";
ALTER TABLE "guests" ALTER COLUMN "waStatus" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "wishes" DROP CONSTRAINT IF EXISTS "wishes_invitationId_fkey";

-- AlterTable
ALTER TABLE "expenses" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "guests" DROP COLUMN IF EXISTS "phoneNumber";

-- AlterTable
ALTER TABLE "invitations" ALTER COLUMN "themeId" SET DEFAULT 'kalandra';

-- AlterTable
ALTER TABLE "partner_affiliates" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "promo_coupons" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE IF EXISTS "wishes";
