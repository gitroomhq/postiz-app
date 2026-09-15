-- Lifetime post metrics, one row per post per UTC day. Null columns are
-- "this provider does not fetch that field", not zero. Request-path
-- analytics reads these; the Temporal sync writes them.
CREATE TABLE "PostMetricSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedDay" DATE NOT NULL,
    "impressions" INTEGER,
    "reactions" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostMetricSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PostMetricSnapshot_postId_capturedDay_key" ON "PostMetricSnapshot"("postId", "capturedDay");
CREATE INDEX "PostMetricSnapshot_organizationId_capturedAt_idx" ON "PostMetricSnapshot"("organizationId", "capturedAt");
CREATE INDEX "PostMetricSnapshot_integrationId_idx" ON "PostMetricSnapshot"("integrationId");
CREATE INDEX "PostMetricSnapshot_postId_idx" ON "PostMetricSnapshot"("postId");

ALTER TABLE "PostMetricSnapshot" ADD CONSTRAINT "PostMetricSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PostMetricSnapshot" ADD CONSTRAINT "PostMetricSnapshot_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PostMetricSnapshot" ADD CONSTRAINT "PostMetricSnapshot_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
