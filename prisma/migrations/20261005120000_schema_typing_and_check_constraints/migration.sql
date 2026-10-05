-- Menutup sisa kelonggaran skema: kolom teks yang sebenarnya himpunan nilai tertutup menjadi enum, kolom yang
-- tidak pernah dibaca dihapus, dan aturan data yang selama ini hanya dijaga kode dipindahkan ke database.
-- Migrasi sengaja GAGAL dengan pesan jelas bila ada nilai di luar himpunan; atomik, tidak ada perubahan setengah jadi.

-- 1. Nilai di luar himpunan harus dikenali sebelum kolom diubah.
DO $$
DECLARE
  bad text;
BEGIN
  SELECT string_agg(DISTINCT status, ', ') INTO bad FROM "webhook_logs"
    WHERE status NOT IN ('received', 'processed', 'amount_mismatch', 'paid_on_closed_order', 'stale_session');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'webhook_logs.status berisi nilai di luar enum WebhookLogStatus: %', bad;
  END IF;

  SELECT string_agg(DISTINCT category, ', ') INTO bad FROM "themes"
    WHERE category NOT IN ('minimalist', 'modern', 'traditional');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'themes.category berisi nilai di luar enum ThemeCategory: %', bad;
  END IF;
END $$;

-- 2. webhook_logs.status dan themes.category menjadi enum.
CREATE TYPE "WebhookLogStatus" AS ENUM ('received', 'processed', 'amount_mismatch', 'paid_on_closed_order', 'stale_session');
ALTER TABLE "webhook_logs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "webhook_logs" ALTER COLUMN "status" TYPE "WebhookLogStatus" USING "status"::"WebhookLogStatus";
ALTER TABLE "webhook_logs" ALTER COLUMN "status" SET DEFAULT 'received';

CREATE TYPE "ThemeCategory" AS ENUM ('minimalist', 'modern', 'traditional');
ALTER TABLE "themes" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "themes" ALTER COLUMN "category" TYPE "ThemeCategory" USING "category"::"ThemeCategory";
ALTER TABLE "themes" ALTER COLUMN "category" SET DEFAULT 'minimalist';

-- 3. orders.paymentMethod wajib terisi (bawaan GATEWAY). Baris lama tanpa nilai: ada bukti transfer berarti manual.
UPDATE "orders"
  SET "paymentMethod" = CASE WHEN "proofImageUrl" IS NOT NULL THEN 'MANUAL_TRANSFER'::"PaymentMethod" ELSE 'GATEWAY'::"PaymentMethod" END
  WHERE "paymentMethod" IS NULL;
ALTER TABLE "orders" ALTER COLUMN "paymentMethod" SET NOT NULL;

-- 4. guest_memories.mediaType tidak pernah dibaca (hanya ditulis, nilainya tercampur IMAGE/PHOTO).
ALTER TABLE "guest_memories" DROP COLUMN "mediaType";

-- 5. Kolom teks berisi JSON: database menolak teks yang bukan JSON. text::jsonb bersifat immutable sehingga sah di CHECK.
ALTER TABLE "invitations"
  ADD CONSTRAINT "chk_invitations_participantsJson_json" CHECK ("participantsJson" IS NULL OR "participantsJson"::jsonb IS NOT NULL),
  ADD CONSTRAINT "chk_invitations_eventData_json" CHECK ("eventData" IS NULL OR "eventData"::jsonb IS NOT NULL),
  ADD CONSTRAINT "chk_invitations_loveStory_json" CHECK ("loveStory" IS NULL OR "loveStory"::jsonb IS NOT NULL),
  ADD CONSTRAINT "chk_invitations_bankAccounts_json" CHECK ("bankAccounts" IS NULL OR "bankAccounts"::jsonb IS NOT NULL),
  ADD CONSTRAINT "chk_invitations_featureSettings_json" CHECK ("featureSettings" IS NULL OR "featureSettings"::jsonb IS NOT NULL);
ALTER TABLE "orders"
  ADD CONSTRAINT "chk_orders_itemsJson_json" CHECK ("itemsJson" IS NULL OR "itemsJson"::jsonb IS NOT NULL);

-- 6. Angka dan rentang yang selama ini hanya dijaga kode.
ALTER TABLE "orders"
  ADD CONSTRAINT "chk_orders_amounts_nonnegative" CHECK (
    "amount" >= 0
    AND ("discountAmount" IS NULL OR "discountAmount" >= 0)
    AND ("chargedAmount" IS NULL OR "chargedAmount" >= 0)
  );
ALTER TABLE "expenses" ADD CONSTRAINT "chk_expenses_amount_nonnegative" CHECK ("amount" >= 0);
ALTER TABLE "recurring_expenses"
  ADD CONSTRAINT "chk_recurring_expenses_amount_nonnegative" CHECK ("estimatedAmount" >= 0),
  ADD CONSTRAINT "chk_recurring_expenses_dueDay_range" CHECK ("dueDayOfMonth" BETWEEN 1 AND 31);
ALTER TABLE "financial_closings"
  ADD CONSTRAINT "chk_financial_closings_period_range" CHECK ("periodMonth" BETWEEN 1 AND 12 AND "periodYear" BETWEEN 2000 AND 2100),
  ADD CONSTRAINT "chk_financial_closings_amounts_nonnegative" CHECK ("grossRevenue" >= 0 AND "totalExpenses" >= 0 AND "taxAmount" >= 0);
ALTER TABLE "partner_affiliates"
  ADD CONSTRAINT "chk_partner_affiliates_balances_nonnegative" CHECK ("commissionValue" >= 0 AND "pendingBalance" >= 0 AND "totalPaidOut" >= 0),
  ADD CONSTRAINT "chk_partner_affiliates_percent_range" CHECK ("commissionType" <> 'PERCENT' OR "commissionValue" <= 100);
ALTER TABLE "promo_coupons"
  ADD CONSTRAINT "chk_promo_coupons_amounts_nonnegative" CHECK (
    "discountValue" >= 0
    AND "minOrderAmount" >= 0
    AND ("maxDiscountAmount" IS NULL OR "maxDiscountAmount" >= 0)
  ),
  ADD CONSTRAINT "chk_promo_coupons_counts_nonnegative" CHECK (
    "usageCount" >= 0
    AND ("quotaLimit" IS NULL OR "quotaLimit" >= 0)
    AND ("perUserLimit" IS NULL OR "perUserLimit" >= 0)
  ),
  ADD CONSTRAINT "chk_promo_coupons_percent_range" CHECK ("discountType" <> 'PERCENT' OR "discountValue" <= 100),
  ADD CONSTRAINT "chk_promo_coupons_validity_order" CHECK ("validFrom" IS NULL OR "validUntil" IS NULL OR "validUntil" >= "validFrom");
ALTER TABLE "promo_holds" ADD CONSTRAINT "chk_promo_holds_discount_nonnegative" CHECK ("discountAmount" >= 0);
ALTER TABLE "affiliate_commissions"
  ADD CONSTRAINT "chk_affiliate_commissions_amounts_nonnegative" CHECK ("orderAmount" >= 0 AND "commissionAmount" >= 0);
ALTER TABLE "guests" ADD CONSTRAINT "chk_guests_quota_nonnegative" CHECK ("guestQuota" >= 0);
ALTER TABLE "rsvps" ADD CONSTRAINT "chk_rsvps_guestCount_nonnegative" CHECK ("guestCount" >= 0);
ALTER TABLE "music_presets" ADD CONSTRAINT "chk_music_presets_duration_nonnegative" CHECK ("durationSec" IS NULL OR "durationSec" >= 0);
