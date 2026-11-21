-- Migrate any legacy GROOM_PHOTO slot declarations/records on PERSONAL & EVENT themes/invitations
-- to their native slots (PROFILE_PHOTO for PERSONAL, EVENT_PHOTO for EVENT).
UPDATE "themes"
SET "media_slots" = ("media_slots" - 'GROOM_PHOTO') || jsonb_build_object('PROFILE_PHOTO', "media_slots"->'GROOM_PHOTO')
WHERE "eventType" = 'PERSONAL'
  AND "media_slots" IS NOT NULL
  AND "media_slots" ? 'GROOM_PHOTO'
  AND NOT ("media_slots" ? 'PROFILE_PHOTO');

UPDATE "themes"
SET "media_slots" = "media_slots" - 'GROOM_PHOTO'
WHERE "eventType" = 'PERSONAL'
  AND "media_slots" IS NOT NULL
  AND "media_slots" ? 'GROOM_PHOTO';

UPDATE "themes"
SET "media_slots" = ("media_slots" - 'GROOM_PHOTO') || jsonb_build_object('EVENT_PHOTO', "media_slots"->'GROOM_PHOTO')
WHERE "eventType" = 'EVENT'
  AND "media_slots" IS NOT NULL
  AND "media_slots" ? 'GROOM_PHOTO'
  AND NOT ("media_slots" ? 'EVENT_PHOTO');

UPDATE "themes"
SET "media_slots" = "media_slots" - 'GROOM_PHOTO'
WHERE "eventType" = 'EVENT'
  AND "media_slots" IS NOT NULL
  AND "media_slots" ? 'GROOM_PHOTO';

-- Migrate snapshot theme_media_slots on existing PERSONAL & EVENT invitations
UPDATE "invitations"
SET "theme_media_slots" = ("theme_media_slots" - 'GROOM_PHOTO') || jsonb_build_object('PROFILE_PHOTO', "theme_media_slots"->'GROOM_PHOTO')
WHERE "eventType" = 'PERSONAL'
  AND "theme_media_slots" IS NOT NULL
  AND "theme_media_slots" ? 'GROOM_PHOTO'
  AND NOT ("theme_media_slots" ? 'PROFILE_PHOTO');

UPDATE "invitations"
SET "theme_media_slots" = "theme_media_slots" - 'GROOM_PHOTO'
WHERE "eventType" = 'PERSONAL'
  AND "theme_media_slots" IS NOT NULL
  AND "theme_media_slots" ? 'GROOM_PHOTO';

UPDATE "invitations"
SET "theme_media_slots" = ("theme_media_slots" - 'GROOM_PHOTO') || jsonb_build_object('EVENT_PHOTO', "theme_media_slots"->'GROOM_PHOTO')
WHERE "eventType" = 'EVENT'
  AND "theme_media_slots" IS NOT NULL
  AND "theme_media_slots" ? 'GROOM_PHOTO'
  AND NOT ("theme_media_slots" ? 'EVENT_PHOTO');

UPDATE "invitations"
SET "theme_media_slots" = "theme_media_slots" - 'GROOM_PHOTO'
WHERE "eventType" = 'EVENT'
  AND "theme_media_slots" IS NOT NULL
  AND "theme_media_slots" ? 'GROOM_PHOTO';

-- Migrate legacy GROOM_PHOTO rows in media table for PERSONAL & EVENT invitations
UPDATE "media" AS m
SET "mediaSlot" = 'PROFILE_PHOTO'::"MediaSlot"
FROM "invitations" AS i
WHERE m."invitationId" = i."id"
  AND i."eventType" = 'PERSONAL'
  AND m."mediaSlot" = 'GROOM_PHOTO'::"MediaSlot"
  AND NOT EXISTS (
    SELECT 1 FROM "media" AS m2
    WHERE m2."invitationId" = i."id" AND m2."mediaSlot" = 'PROFILE_PHOTO'::"MediaSlot"
  );

UPDATE "media" AS m
SET "mediaSlot" = 'EVENT_PHOTO'::"MediaSlot"
FROM "invitations" AS i
WHERE m."invitationId" = i."id"
  AND i."eventType" = 'EVENT'
  AND m."mediaSlot" = 'GROOM_PHOTO'::"MediaSlot"
  AND NOT EXISTS (
    SELECT 1 FROM "media" AS m2
    WHERE m2."invitationId" = i."id" AND m2."mediaSlot" = 'EVENT_PHOTO'::"MediaSlot"
  );
