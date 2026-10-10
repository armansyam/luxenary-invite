-- Nama peserta disimpan di dua tempat: pernikahan di kolom groom*/bride*, acara lain di participantsJson yang
-- disalin ulang ke groom* (mirrorParticipantNames) agar resepsionis, QR, email, dan audit terbit bisa membacanya.
-- Kini participantsJson satu-satunya sumber untuk semua jenis acara:
--   WEDDING   { groom: {name, nickname, father, mother, instagram}, bride: {...} }
--   BIRTHDAY  { person: {name, nickname, age, fatherName, motherName, instagram} }
--   KHITAN    { child: {name, nickname, age}, parents: {father, mother} }
--   AQIQAH    { baby: {name, nickname, ...}, parents: {father, mother} }
--   WISUDA    { person: {name, nickname, degree, major, institution} }
--   GATHERING { event: {title, subtitle, organizer} }
-- groomParents/brideParents (teks bebas lama, tidak lagi dapat diisi editor) dan groomSlug/brideSlug (tidak dipakai
-- routing) ikut dihapus.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "invitations" WHERE COALESCE(btrim("groomParents"), '') <> '' OR COALESCE(btrim("brideParents"), '') <> '') THEN
    RAISE EXCEPTION 'groomParents/brideParents masih berisi teks; pindahkan ke nama ayah/ibu mempelai sebelum menjalankan migrasi ini';
  END IF;
END $$;

UPDATE "invitations"
SET "participantsJson" = COALESCE("participantsJson", '{}'::jsonb) || jsonb_build_object(
  'groom', jsonb_strip_nulls(jsonb_build_object(
    'name', NULLIF(btrim("groomName"), ''),
    'nickname', NULLIF(btrim("groomNickname"), ''),
    'father', NULLIF(btrim("groomFather"), ''),
    'mother', NULLIF(btrim("groomMother"), ''),
    'instagram', NULLIF(btrim("groomInstagram"), '')
  )),
  'bride', jsonb_strip_nulls(jsonb_build_object(
    'name', NULLIF(btrim("brideName"), ''),
    'nickname', NULLIF(btrim("brideNickname"), ''),
    'father', NULLIF(btrim("brideFather"), ''),
    'mother', NULLIF(btrim("brideMother"), ''),
    'instagram', NULLIF(btrim("brideInstagram"), '')
  ))
)
WHERE "eventType" = 'WEDDING';

-- Undangan non-pernikahan lama yang namanya hanya tersimpan di kolom groom* (sebelum wizard menulis participantsJson).
UPDATE "invitations"
SET "participantsJson" = jsonb_set(
  COALESCE("participantsJson", '{}'::jsonb),
  ARRAY[CASE "eventType" WHEN 'KHITAN' THEN 'child' WHEN 'AQIQAH' THEN 'baby' ELSE 'person' END],
  jsonb_strip_nulls(jsonb_build_object('name', NULLIF(btrim("groomName"), ''), 'nickname', NULLIF(btrim("groomNickname"), '')))
    || COALESCE("participantsJson" -> CASE "eventType" WHEN 'KHITAN' THEN 'child' WHEN 'AQIQAH' THEN 'baby' ELSE 'person' END, '{}'::jsonb)
)
WHERE "eventType" IN ('BIRTHDAY', 'KHITAN', 'AQIQAH', 'WISUDA') AND COALESCE(btrim("groomName"), '') <> '';

UPDATE "invitations"
SET "participantsJson" = jsonb_set(
  COALESCE("participantsJson", '{}'::jsonb),
  '{event}',
  jsonb_build_object('title', btrim("groomName")) || COALESCE("participantsJson" -> 'event', '{}'::jsonb)
)
WHERE "eventType" = 'GATHERING' AND COALESCE(btrim("groomName"), '') <> '';

ALTER TABLE "invitations"
  DROP COLUMN "groomName",
  DROP COLUMN "groomNickname",
  DROP COLUMN "groomParents",
  DROP COLUMN "groomFather",
  DROP COLUMN "groomMother",
  DROP COLUMN "groomInstagram",
  DROP COLUMN "brideName",
  DROP COLUMN "brideNickname",
  DROP COLUMN "brideParents",
  DROP COLUMN "brideFather",
  DROP COLUMN "brideMother",
  DROP COLUMN "brideInstagram",
  DROP COLUMN "groomSlug",
  DROP COLUMN "brideSlug";
