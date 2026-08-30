-- AlterTable
ALTER TABLE "ScheduleItem" ADD COLUMN "location" TEXT,
ADD COLUMN "time" TEXT;

-- AlterTable: add structured intro fields
ALTER TABLE "Participant" ADD COLUMN "introName" TEXT,
ADD COLUMN "nickname" TEXT,
ADD COLUMN "likes" TEXT,
ADD COLUMN "dislikes" TEXT,
ADD COLUMN "quirks" TEXT,
ADD COLUMN "extra" TEXT;

-- Preserve existing freeform bio text by moving it into "extra" before dropping the column
UPDATE "Participant" SET "extra" = "bio" WHERE "bio" IS NOT NULL;

-- AlterTable: drop old freeform bio column
ALTER TABLE "Participant" DROP COLUMN "bio";
