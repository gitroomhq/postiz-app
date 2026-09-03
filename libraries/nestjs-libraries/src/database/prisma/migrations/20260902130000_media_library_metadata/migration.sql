-- Forward-only Media Library metadata migration. Safe for existing Postiz data.
ALTER TABLE "Media"
  ADD COLUMN IF NOT EXISTS "title" TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "mimeType" TEXT,
  ADD COLUMN IF NOT EXISTS "width" INTEGER,
  ADD COLUMN IF NOT EXISTS "height" INTEGER,
  ADD COLUMN IF NOT EXISTS "durationMs" INTEGER,
  ADD COLUMN IF NOT EXISTS "dominantColor" TEXT,
  ADD COLUMN IF NOT EXISTS "people" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "products" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "focusX" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "focusY" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "recommendedPlatforms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "source" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "attribution" TEXT,
  ADD COLUMN IF NOT EXISTS "copyrightOwner" TEXT,
  ADD COLUMN IF NOT EXISTS "licenseType" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "licenseUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

CREATE TABLE IF NOT EXISTS "MediaCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#612BD3',
  "orgId" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MediaCategory_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TagsMedia" (
  "mediaId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TagsMedia_pkey" PRIMARY KEY ("mediaId", "tagId"),
  CONSTRAINT "TagsMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TagsMedia_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tags"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MediaCategory_orgId_name_key" ON "MediaCategory"("orgId", "name");
CREATE INDEX IF NOT EXISTS "MediaCategory_orgId_deletedAt_idx" ON "MediaCategory"("orgId", "deletedAt");
CREATE INDEX IF NOT EXISTS "TagsMedia_tagId_idx" ON "TagsMedia"("tagId");
CREATE INDEX IF NOT EXISTS "Media_organizationId_status_idx" ON "Media"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Media_organizationId_expiresAt_idx" ON "Media"("organizationId", "expiresAt");
CREATE INDEX IF NOT EXISTS "Media_categoryId_idx" ON "Media"("categoryId");

DO $$ BEGIN
  ALTER TABLE "Media" ADD CONSTRAINT "Media_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "MediaCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
