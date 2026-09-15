-- Login identities move off User.providerId / appleProviderId onto their own
-- table so Google, GitHub, Apple, OIDC (and the rest) can be linked to one
-- User without a second User row. Session JWT still keys off User.id.
--
-- User.providerName / providerId / appleProviderId stay for the transition:
-- login looks at UserIdentity first, then those columns.

-- appleProviderId and sessionsNotBefore are in schema + application code but
-- were never added by a named migration (only db push on some installs).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "appleProviderId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionsNotBefore" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_appleProviderId_key" ON "User"("appleProviderId");

CREATE TABLE "UserIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserIdentity_provider_not_local" CHECK ("provider" <> 'LOCAL')
);

CREATE UNIQUE INDEX "UserIdentity_provider_providerAccountId_key" ON "UserIdentity"("provider", "providerAccountId");
CREATE UNIQUE INDEX "UserIdentity_userId_provider_key" ON "UserIdentity"("userId", "provider");
CREATE INDEX "UserIdentity_userId_idx" ON "UserIdentity"("userId");

ALTER TABLE "UserIdentity" ADD CONSTRAINT "UserIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LOCAL rows that already hold a Google id (oauth-local-link attaches there).
INSERT INTO "UserIdentity" ("id", "userId", "provider", "providerAccountId", "createdAt", "updatedAt")
SELECT
    md5('google:' || "id" || ':' || "providerId"),
    "id",
    'GOOGLE',
    "providerId",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
WHERE "deletedAt" IS NULL
  AND "providerName" = 'LOCAL'
  AND "providerId" IS NOT NULL
  AND "providerId" <> ''
ON CONFLICT DO NOTHING;

-- Apple id stored on appleProviderId (LOCAL or otherwise).
INSERT INTO "UserIdentity" ("id", "userId", "provider", "providerAccountId", "createdAt", "updatedAt")
SELECT
    md5('apple:' || "id" || ':' || "appleProviderId"),
    "id",
    'APPLE',
    "appleProviderId",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
WHERE "deletedAt" IS NULL
  AND "appleProviderId" IS NOT NULL
  AND "appleProviderId" <> ''
ON CONFLICT DO NOTHING;

-- Native OAuth User rows (GOOGLE / GITHUB / APPLE / …) keyed by providerId.
INSERT INTO "UserIdentity" ("id", "userId", "provider", "providerAccountId", "createdAt", "updatedAt")
SELECT
    md5("providerName"::text || ':' || "id" || ':' || "providerId"),
    "id",
    "providerName",
    "providerId",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
WHERE "deletedAt" IS NULL
  AND "providerName" <> 'LOCAL'
  AND "providerId" IS NOT NULL
  AND "providerId" <> ''
ON CONFLICT DO NOTHING;

-- Same inbox, two memberships in one org: keep SUPERADMIN (else oldest),
-- disable the extra rows. Same-user cannot appear twice (unique userId+orgId);
-- this is two User rows that share an email via different providerName values.
WITH ranked AS (
  SELECT
    uo.id,
    ROW_NUMBER() OVER (
      PARTITION BY uo."organizationId", lower(u.email)
      ORDER BY
        CASE WHEN uo.role = 'SUPERADMIN' THEN 0 ELSE 1 END,
        uo."createdAt" ASC
    ) AS rn
  FROM "UserOrganization" uo
  JOIN "User" u ON u.id = uo."userId"
  WHERE u."deletedAt" IS NULL
    AND uo.disabled = false
)
UPDATE "UserOrganization" AS uo
SET disabled = true
FROM ranked
WHERE uo.id = ranked.id
  AND ranked.rn > 1;
