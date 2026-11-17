CREATE TABLE IF NOT EXISTS "FacebookAdsConnection" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "facebookUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "accessToken" TEXT NOT NULL,
  "tokenExpiration" TIMESTAMP(3),
  "selectedBusinessId" TEXT,
  "selectedAdAccountId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FacebookAdsConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FacebookAdsConnection_organizationId_key" ON "FacebookAdsConnection"("organizationId");
CREATE INDEX IF NOT EXISTS "FacebookAdsConnection_organizationId_idx" ON "FacebookAdsConnection"("organizationId");
CREATE INDEX IF NOT EXISTS "FacebookAdsConnection_facebookUserId_idx" ON "FacebookAdsConnection"("facebookUserId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FacebookAdsConnection_organizationId_fkey'
  ) THEN
    ALTER TABLE "FacebookAdsConnection"
      ADD CONSTRAINT "FacebookAdsConnection_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;