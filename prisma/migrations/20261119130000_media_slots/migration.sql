-- Slot media klien yang dipakai tema, dan salinannya di undangan saat tema dipilih (lib/themeMediaSlots.ts).
ALTER TABLE "themes" ADD COLUMN "media_slots" JSONB;
ALTER TABLE "invitations" ADD COLUMN "theme_media_slots" JSONB;
