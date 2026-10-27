-- AlterTable
ALTER TABLE "themes" ADD COLUMN "default_media" JSONB;

-- AlterTable
ALTER TABLE "invitations" ADD COLUMN "theme_default_media" JSONB;
