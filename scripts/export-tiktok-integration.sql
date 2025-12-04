-- Export TikTok Integration from source database
-- Run this on your web/production database

-- First, get your organization ID (you'll need this for import)
SELECT id, name FROM "Organization" LIMIT 1;

-- Export the TikTok integration
SELECT 
  id,
  "internalId",
  "organizationId",
  name,
  picture,
  "providerIdentifier",
  type,
  token,
  disabled,
  "tokenExpiration",
  "refreshToken",
  profile,
  "postingTimes",
  "additionalSettings",
  "rootInternalId",
  "inBetweenSteps"
FROM "Integration"
WHERE "providerIdentifier" = 'tiktok' 
  AND "deletedAt" IS NULL
LIMIT 1;
