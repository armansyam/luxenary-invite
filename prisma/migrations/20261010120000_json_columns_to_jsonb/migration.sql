-- Kolom berisi JSON disimpan sebagai teks dan dijaga CHECK "teks ini JSON" (migrasi 20261005120000). Setiap pembaca
-- harus JSON.parse dengan penanganan galat sendiri dan setiap penulis JSON.stringify. Kini bertipe jsonb, dan CHECK
-- menegakkan bentuk yang dipakai aplikasi, sehingga JSON.stringify yang tertinggal (tersimpan sebagai string jsonb)
-- ditolak database alih-alih diam-diam merusak data.
ALTER TABLE "invitations"
  DROP CONSTRAINT "chk_invitations_participantsJson_json",
  DROP CONSTRAINT "chk_invitations_eventData_json",
  DROP CONSTRAINT "chk_invitations_loveStory_json",
  DROP CONSTRAINT "chk_invitations_bankAccounts_json",
  DROP CONSTRAINT "chk_invitations_featureSettings_json";
ALTER TABLE "orders" DROP CONSTRAINT "chk_orders_itemsJson_json";

ALTER TABLE "invitations"
  ALTER COLUMN "participantsJson" TYPE JSONB USING "participantsJson"::jsonb,
  ALTER COLUMN "eventData" TYPE JSONB USING "eventData"::jsonb,
  ALTER COLUMN "loveStory" TYPE JSONB USING "loveStory"::jsonb,
  ALTER COLUMN "bankAccounts" TYPE JSONB USING "bankAccounts"::jsonb,
  ALTER COLUMN "featureSettings" TYPE JSONB USING "featureSettings"::jsonb;
ALTER TABLE "orders" ALTER COLUMN "itemsJson" TYPE JSONB USING "itemsJson"::jsonb;

-- Nilai berbentuk lain (mis. JSON null atau array kosong pada kolom objek) tidak pernah terbaca aplikasi.
UPDATE "invitations" SET "participantsJson" = NULL WHERE jsonb_typeof("participantsJson") IS DISTINCT FROM 'object' AND "participantsJson" IS NOT NULL;
UPDATE "invitations" SET "featureSettings" = NULL WHERE jsonb_typeof("featureSettings") IS DISTINCT FROM 'object' AND "featureSettings" IS NOT NULL;
UPDATE "invitations" SET "eventData" = NULL WHERE jsonb_typeof("eventData") IS DISTINCT FROM 'array' AND "eventData" IS NOT NULL;
UPDATE "invitations" SET "loveStory" = NULL WHERE jsonb_typeof("loveStory") IS DISTINCT FROM 'array' AND "loveStory" IS NOT NULL;
UPDATE "invitations" SET "bankAccounts" = NULL WHERE jsonb_typeof("bankAccounts") IS DISTINCT FROM 'array' AND "bankAccounts" IS NOT NULL;
UPDATE "orders" SET "itemsJson" = NULL WHERE jsonb_typeof("itemsJson") IS DISTINCT FROM 'array' AND "itemsJson" IS NOT NULL;

ALTER TABLE "invitations"
  ADD CONSTRAINT "chk_invitations_participantsJson_object" CHECK ("participantsJson" IS NULL OR jsonb_typeof("participantsJson") = 'object'),
  ADD CONSTRAINT "chk_invitations_featureSettings_object" CHECK ("featureSettings" IS NULL OR jsonb_typeof("featureSettings") = 'object'),
  ADD CONSTRAINT "chk_invitations_eventData_array" CHECK ("eventData" IS NULL OR jsonb_typeof("eventData") = 'array'),
  ADD CONSTRAINT "chk_invitations_loveStory_array" CHECK ("loveStory" IS NULL OR jsonb_typeof("loveStory") = 'array'),
  ADD CONSTRAINT "chk_invitations_bankAccounts_array" CHECK ("bankAccounts" IS NULL OR jsonb_typeof("bankAccounts") = 'array');
ALTER TABLE "orders"
  ADD CONSTRAINT "chk_orders_itemsJson_array" CHECK ("itemsJson" IS NULL OR jsonb_typeof("itemsJson") = 'array');
