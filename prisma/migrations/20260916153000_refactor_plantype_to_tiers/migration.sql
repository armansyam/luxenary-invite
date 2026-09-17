-- CreateEnum PlanType_new
CREATE TYPE "PlanType_new" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- AlterTable orders
ALTER TABLE "orders" ALTER COLUMN "planType" TYPE "PlanType_new" USING (
  CASE "planType"::text
    WHEN 'TRADITIONAL' THEN 'TIER_1'::"PlanType_new"
    WHEN 'MODERN' THEN 'TIER_2'::"PlanType_new"
    WHEN 'PREMIUM' THEN 'TIER_3'::"PlanType_new"
    ELSE 'TIER_1'::"PlanType_new"
  END
);

ALTER TABLE "orders" ALTER COLUMN "upgradedFromPlan" TYPE "PlanType_new" USING (
  CASE "upgradedFromPlan"::text
    WHEN 'TRADITIONAL' THEN 'TIER_1'::"PlanType_new"
    WHEN 'MODERN' THEN 'TIER_2'::"PlanType_new"
    WHEN 'PREMIUM' THEN 'TIER_3'::"PlanType_new"
    ELSE NULL
  END
);

ALTER TABLE "orders" ALTER COLUMN "targetPlanType" TYPE "PlanType_new" USING (
  CASE "targetPlanType"::text
    WHEN 'TRADITIONAL' THEN 'TIER_1'::"PlanType_new"
    WHEN 'MODERN' THEN 'TIER_2'::"PlanType_new"
    WHEN 'PREMIUM' THEN 'TIER_3'::"PlanType_new"
    ELSE NULL
  END
);

-- AlterTable promo_coupons (drop default -> convert to text[] -> array_replace -> convert to PlanType_new[] -> set default)
ALTER TABLE "promo_coupons" ALTER COLUMN "applicablePlans" DROP DEFAULT;
ALTER TABLE "promo_coupons" ALTER COLUMN "applicablePlans" TYPE text[] USING "applicablePlans"::text[];
UPDATE "promo_coupons" SET "applicablePlans" = array_replace(array_replace(array_replace("applicablePlans", 'TRADITIONAL', 'TIER_1'), 'MODERN', 'TIER_2'), 'PREMIUM', 'TIER_3');
ALTER TABLE "promo_coupons" ALTER COLUMN "applicablePlans" TYPE "PlanType_new"[] USING "applicablePlans"::"PlanType_new"[];
ALTER TABLE "promo_coupons" ALTER COLUMN "applicablePlans" SET DEFAULT ARRAY[]::"PlanType_new"[];

-- Drop old Enum and Rename new Enum
DROP TYPE "PlanType";
ALTER TYPE "PlanType_new" RENAME TO "PlanType";

-- Update admin_settings keys to tier-based naming
UPDATE "admin_settings" SET "key" = 'price_tier1' WHERE "key" = 'price_traditional';
UPDATE "admin_settings" SET "key" = 'price_tier2' WHERE "key" = 'price_modern';
UPDATE "admin_settings" SET "key" = 'price_tier3' WHERE "key" = 'price_premium';

UPDATE "admin_settings" SET "key" = 'name_tier1' WHERE "key" = 'name_traditional';
UPDATE "admin_settings" SET "key" = 'name_tier2' WHERE "key" = 'name_modern';
UPDATE "admin_settings" SET "key" = 'name_tier3' WHERE "key" = 'name_premium';

UPDATE "admin_settings" SET "key" = 'desc_tier1' WHERE "key" = 'desc_traditional';
UPDATE "admin_settings" SET "key" = 'desc_tier2' WHERE "key" = 'desc_modern';
UPDATE "admin_settings" SET "key" = 'desc_tier3' WHERE "key" = 'desc_premium';

UPDATE "admin_settings" SET "key" = 'features_tier1' WHERE "key" = 'features_traditional';
UPDATE "admin_settings" SET "key" = 'features_tier2' WHERE "key" = 'features_modern';
UPDATE "admin_settings" SET "key" = 'features_tier3' WHERE "key" = 'features_premium';

UPDATE "admin_settings" SET "key" = 'capabilities_tier1' WHERE "key" = 'capabilities_traditional';
UPDATE "admin_settings" SET "key" = 'capabilities_tier2' WHERE "key" = 'capabilities_modern';
UPDATE "admin_settings" SET "key" = 'capabilities_tier3' WHERE "key" = 'capabilities_premium';

UPDATE "admin_settings" SET "key" = 'memories_total_quota_tier1' WHERE "key" = 'memories_total_quota_traditional';
UPDATE "admin_settings" SET "key" = 'memories_total_quota_tier2' WHERE "key" = 'memories_total_quota_modern';
UPDATE "admin_settings" SET "key" = 'memories_total_quota_tier3' WHERE "key" = 'memories_total_quota_premium';

UPDATE "admin_settings" SET "key" = 'memories_max_contributors_tier1' WHERE "key" = 'memories_max_contributors_traditional';
UPDATE "admin_settings" SET "key" = 'memories_max_contributors_tier2' WHERE "key" = 'memories_max_contributors_modern';
UPDATE "admin_settings" SET "key" = 'memories_max_contributors_tier3' WHERE "key" = 'memories_max_contributors_premium';

UPDATE "admin_settings" SET "key" = 'memories_shots_quota_tier1' WHERE "key" = 'memories_shots_quota_traditional';
UPDATE "admin_settings" SET "key" = 'memories_shots_quota_tier2' WHERE "key" = 'memories_shots_quota_modern';
UPDATE "admin_settings" SET "key" = 'memories_shots_quota_tier3' WHERE "key" = 'memories_shots_quota_premium';
