-- CreateEnum
CREATE TYPE "PackingScope" AS ENUM ('PERSONAL', 'SHARED');

-- AlterTable
ALTER TABLE "PackingItem" ADD COLUMN     "scope" "PackingScope" NOT NULL DEFAULT 'PERSONAL';

-- CreateIndex
CREATE INDEX "PackingItem_tripId_scope_idx" ON "PackingItem"("tripId", "scope");
