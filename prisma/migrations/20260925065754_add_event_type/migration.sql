-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('WEDDING', 'BIRTHDAY', 'KHITAN', 'AQIQAH', 'WISUDA', 'GATHERING');

-- AlterTable
ALTER TABLE "invitations" ADD COLUMN     "eventType" "EventType" NOT NULL DEFAULT 'WEDDING',
ADD COLUMN     "participantsJson" TEXT;

-- AlterTable
ALTER TABLE "themes" ADD COLUMN     "eventType" "EventType" NOT NULL DEFAULT 'WEDDING',
ADD COLUMN     "parentTheme" TEXT;
