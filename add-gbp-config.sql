-- GBP Configuration Migration Script
-- This script adds Google Business Profile OAuth credentials to the database
-- Run this after updating the GBP provider code

-- First, get an organization ID (replace with your actual org ID)
-- SELECT id, name FROM organization LIMIT 1;

-- Example with a placeholder organization ID
-- Replace 'YOUR_ORG_ID_HERE' with your actual organization ID

-- Insert GBP Platform Config
INSERT INTO "SocialMediaPlatformConfig" (
  "id",
  "platform",
  "platformKey",
  "organizationId",
  "customerId",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'Google Business Profile',
  'GBP',
  'YOUR_ORG_ID_HERE',
  NULL,
  NOW(),
  NOW()
) ON CONFLICT ("platformKey", "organizationId", "customerId") DO UPDATE
SET
  "platform" = EXCLUDED."platform",
  "updatedAt" = NOW();

-- Get the config ID for the next insert
-- SELECT id FROM "SocialMediaPlatformConfig" WHERE "platformKey" = 'GBP' AND "organizationId" = 'YOUR_ORG_ID_HERE';

-- Insert Google Client ID
INSERT INTO "SocialMediaPlatformConfigItem" (
  "id",
  "key",
  "value",
  "configId"
)
SELECT
  gen_random_uuid(),
  'GOOGLE_CLIENT_ID',
  '662105185459-4k52hkttqersqt221jra9g0j22jlumiu.apps.googleusercontent.com',
  c.id
FROM "SocialMediaPlatformConfig" c
WHERE c."platformKey" = 'GBP' AND c."organizationId" = 'YOUR_ORG_ID_HERE'
ON CONFLICT ("key", "configId") DO UPDATE
SET "value" = EXCLUDED."value";

-- Insert Google Client Secret
INSERT INTO "SocialMediaPlatformConfigItem" (
  "id",
  "key",
  "value",
  "configId"
)
SELECT
  gen_random_uuid(),
  'GOOGLE_CLIENT_SECRET',
  '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',
  c.id
FROM "SocialMediaPlatformConfig" c
WHERE c."platformKey" = 'GBP' AND c."organizationId" = 'YOUR_ORG_ID_HERE'
ON CONFLICT ("key", "configId") DO UPDATE
SET "value" = EXCLUDED."value";

-- Insert Frontend URL
INSERT INTO "SocialMediaPlatformConfigItem" (
  "id",
  "key",
  "value",
  "configId"
)
SELECT
  gen_random_uuid(),
  'FRONTEND_URL',
  'http://localhost:4200',
  c.id
FROM "SocialMediaPlatformConfig" c
WHERE c."platformKey" = 'GBP' AND c."organizationId" = 'YOUR_ORG_ID_HERE'
ON CONFLICT ("key", "configId") DO UPDATE
SET "value" = EXCLUDED."value";

-- Verify the inserts
SELECT
  c."platform",
  c."platformKey",
  i."key",
  i."value"
FROM "SocialMediaPlatformConfig" c
JOIN "SocialMediaPlatformConfigItem" i ON c."id" = i."configId"
WHERE c."platformKey" = 'GBP' AND c."organizationId" = 'YOUR_ORG_ID_HERE';
