-- VOC-43: idempotent posting claim (additive, nullable column + index).
-- Safe to apply on live data: nullable column with no default, no type change.

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "postingClaimedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Post_postingClaimedAt_idx" ON "Post"("postingClaimedAt");
