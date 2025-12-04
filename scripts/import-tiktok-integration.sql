-- Import TikTok Integration to local database
-- 
-- Instructions:
-- 1. Run export-tiktok-integration.sql on your web database
-- 2. Get your local organization ID (see query below)
-- 3. Replace the values in this script with your exported data
-- 4. Run this script on your local database

-- Step 1: Get your local organization ID
SELECT id, name FROM "Organization" LIMIT 1;

-- Step 2: Replace 'YOUR_LOCAL_ORG_ID' with the ID from above
-- Step 3: Replace all other 'YOUR_*' values with data from export

INSERT INTO "Integration" (
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
  "inBetweenSteps",
  "refreshNeeded",
  "createdAt",
  "updatedAt"
) VALUES (
  'YOUR_INTERNAL_ID',                    -- from export
  'YOUR_LOCAL_ORG_ID',                   -- from local Organization table
  'YOUR_ACCOUNT_NAME',                   -- from export
  'YOUR_AVATAR_URL_OR_NULL',            -- from export (or NULL)
  'tiktok',
  'social',
  'YOUR_ACCESS_TOKEN',                   -- from export
  false,                                 -- or true if disabled
  'YOUR_TOKEN_EXPIRATION'::timestamp,   -- from export (or NULL)
  'YOUR_REFRESH_TOKEN',                 -- from export (or NULL)
  'YOUR_USERNAME',                       -- from export (or NULL)
  '[{"time":120}, {"time":400}, {"time":700}]',  -- from export or default
  '[]',                                  -- from export or default
  'YOUR_ROOT_INTERNAL_ID',              -- from export (or NULL)
  false,                                 -- from export
  false,
  NOW(),
  NOW()
) ON CONFLICT ("organizationId", "internalId") 
DO UPDATE SET
  token = EXCLUDED.token,
  "refreshToken" = EXCLUDED."refreshToken",
  "tokenExpiration" = EXCLUDED."tokenExpiration",
  name = EXCLUDED.name,
  picture = EXCLUDED.picture,
  profile = EXCLUDED.profile,
  "postingTimes" = EXCLUDED."postingTimes",
  "additionalSettings" = EXCLUDED."additionalSettings",
  disabled = EXCLUDED.disabled,
  "refreshNeeded" = false,
  "updatedAt" = NOW();

-- Verify the import
SELECT id, name, profile, "providerIdentifier", "tokenExpiration"
FROM "Integration"
WHERE "providerIdentifier" = 'tiktok' 
  AND "organizationId" = 'YOUR_LOCAL_ORG_ID'
  AND "deletedAt" IS NULL;
