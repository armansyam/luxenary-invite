-- lux:contract pra-peluncuran belum ada pelanggan live; rapikan EventType menjadi 3 kategori struktural (WEDDING, PERSONAL, EVENT) + kolom dinamis sub_event

-- 1. Tambah kolom dinamis sub_event pada themes dan invitations
ALTER TABLE "themes" ADD COLUMN IF NOT EXISTS "sub_event" TEXT;
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "sub_event" TEXT;

-- 2. Backfill sub_event dari jenis acara lama sebelum enum disederhanakan menjadi 3 kategori struktural
UPDATE "themes"
SET "sub_event" = CASE "eventType"::text
  WHEN 'BIRTHDAY' THEN 'Ulang Tahun'
  WHEN 'KHITAN' THEN 'Khitanan'
  WHEN 'AQIQAH' THEN 'Aqiqah'
  WHEN 'WISUDA' THEN 'Wisuda'
  WHEN 'GATHERING' THEN CASE "id"
    WHEN 'sinergi' THEN 'Corporate'
    WHEN 'cakrawala' THEN 'Corporate'
    WHEN 'prakarsa' THEN 'Seminar & Workshop'
    WHEN 'forum' THEN 'Seminar & Workshop'
    WHEN 'temu' THEN 'Reuni'
    WHEN 'jamuan' THEN 'Syukuran'
    WHEN 'panggung' THEN 'Grand Opening'
    WHEN 'prisma' THEN 'Product Launch'
    ELSE 'Gathering'
  END
  ELSE "sub_event"
END
WHERE "sub_event" IS NULL;

UPDATE "invitations"
SET "sub_event" = CASE "eventType"::text
  WHEN 'BIRTHDAY' THEN 'Ulang Tahun'
  WHEN 'KHITAN' THEN 'Khitanan'
  WHEN 'AQIQAH' THEN 'Aqiqah'
  WHEN 'WISUDA' THEN 'Wisuda'
  ELSE "sub_event"
END
WHERE "sub_event" IS NULL;

-- 3. Ganti enum EventType menjadi tepat 3 kategori struktural: WEDDING, PERSONAL, EVENT
CREATE TYPE "EventType_new" AS ENUM ('WEDDING', 'PERSONAL', 'EVENT');

ALTER TABLE "themes" ALTER COLUMN "eventType" DROP DEFAULT;
ALTER TABLE "invitations" ALTER COLUMN "eventType" DROP DEFAULT;

ALTER TABLE "themes"
  ALTER COLUMN "eventType" TYPE "EventType_new"
  USING (
    CASE "eventType"::text
      WHEN 'WEDDING' THEN 'WEDDING'
      WHEN 'GATHERING' THEN 'EVENT'
      ELSE 'PERSONAL'
    END::"EventType_new"
  );

ALTER TABLE "invitations"
  ALTER COLUMN "eventType" TYPE "EventType_new"
  USING (
    CASE "eventType"::text
      WHEN 'WEDDING' THEN 'WEDDING'
      WHEN 'GATHERING' THEN 'EVENT'
      ELSE 'PERSONAL'
    END::"EventType_new"
  );

DROP TYPE "EventType";
ALTER TYPE "EventType_new" RENAME TO "EventType";

ALTER TABLE "themes" ALTER COLUMN "eventType" SET DEFAULT 'WEDDING'::"EventType";
ALTER TABLE "invitations" ALTER COLUMN "eventType" SET DEFAULT 'WEDDING'::"EventType";

-- 4. Sinkronkan pengaturan enabled_event_types dan spesifikasi JSON Theme Builder
UPDATE "admin_settings"
SET "value" = 'WEDDING,PERSONAL,EVENT'
WHERE "key" = 'enabled_event_types';

UPDATE "themes"
SET "builder_spec" = jsonb_set(
  "builder_spec",
  '{eventType}',
  to_jsonb(
    CASE ("builder_spec"->>'eventType')
      WHEN 'WEDDING' THEN 'WEDDING'
      WHEN 'GATHERING' THEN 'EVENT'
      WHEN 'EVENT' THEN 'EVENT'
      ELSE 'PERSONAL'
    END
  )
)
WHERE "builder_spec" IS NOT NULL AND ("builder_spec"->>'eventType') IS NOT NULL;

-- 5. Pisahkan slot foto profil utama berdasarkan 3 mode: WEDDING (GROOM_PHOTO/BRIDE_PHOTO), PERSONAL (PROFILE_PHOTO), EVENT (EVENT_PHOTO)
ALTER TYPE "MediaSlot" ADD VALUE IF NOT EXISTS 'PROFILE_PHOTO';
ALTER TYPE "MediaSlot" ADD VALUE IF NOT EXISTS 'EVENT_PHOTO';

