# Migrating TikTok Authentication

You have three options to use your TikTok account on your local setup:

## Option 1: Database Export/Import (Recommended if you want to keep existing setup)

This method copies the TikTok integration record from your web database to your local database.

### Steps:

1. **Export from web database:**
   ```sql
   -- Connect to your web database and run:
   SELECT 
     id, internalId, organizationId, name, picture, providerIdentifier, 
     type, token, disabled, "tokenExpiration", "refreshToken", profile, 
     "postingTimes", "additionalSettings"
   FROM "Integration"
   WHERE "providerIdentifier" = 'tiktok' AND "deletedAt" IS NULL;
   ```

2. **Save the output** (you'll need these values)

3. **Import to local database:**
   ```sql
   -- Connect to your local database and run:
   -- Replace the values with your exported data
   INSERT INTO "Integration" (
     id, "internalId", "organizationId", name, picture, "providerIdentifier",
     type, token, disabled, "tokenExpiration", "refreshToken", profile,
     "postingTimes", "additionalSettings", "createdAt", "updatedAt"
   ) VALUES (
     'your-integration-id',
     'your-internal-id',
     'your-org-id',
     'your-account-name',
     'avatar-url-or-null',
     'tiktok',
     'social',
     'your-access-token',
     false,
     '2024-12-31T23:59:59.000Z'::timestamp, -- token expiration
     'your-refresh-token',
     'your-username',
     '[{"time":120}, {"time":400}, {"time":700}]',
     '[]',
     NOW(),
     NOW()
   ) ON CONFLICT DO NOTHING;
   ```

**Note:** You'll need to:
- Get your local `organizationId` first (from your local Organization table)
- Update the `organizationId` in the INSERT statement

## Option 2: Re-authenticate Locally (Easiest)

This is the simplest approach - just re-authenticate on your local setup.

### Steps:

1. **Set up environment variables** in your `.env` file:
   ```bash
   TIKTOK_CLIENT_ID="your-client-id"
   TIKTOK_CLIENT_SECRET="your-client-secret"
   FRONTEND_URL="http://localhost:4200"  # or your local URL
   ```

2. **Make sure your TikTok app redirect URI includes your local URL:**
   - Go to TikTok Developer Portal
   - Add `http://localhost:4200/integrations/social/tiktok` to allowed redirect URIs

3. **Start your local app** and authenticate through the UI

## Option 3: Docker Compose Setup

If you want to run everything in Docker, you can extend the existing `docker-compose.dev.yaml`.

### Steps:

1. **Add environment variables** to your `.env` file (same as Option 2)

2. **The docker-compose.dev.yaml already has:**
   - PostgreSQL database
   - Redis
   - pgAdmin (for database management)

3. **You'll need to run the app services separately** or add them to docker-compose:
   ```yaml
   # Add to docker-compose.dev.yaml if you want full stack
   postiz-backend:
     build: ./apps/backend
     environment:
       - DATABASE_URL=postgresql://postiz-local:postiz-local-pwd@postiz-postgres:5432/postiz-db-local
       - REDIS_URL=redis://postiz-redis:6379
       - TIKTOK_CLIENT_ID=${TIKTOK_CLIENT_ID}
       - TIKTOK_CLIENT_SECRET=${TIKTOK_CLIENT_SECRET}
       - FRONTEND_URL=${FRONTEND_URL}
     depends_on:
       - postiz-postgres
       - postiz-redis
     ports:
       - "3000:3000"
   
   postiz-frontend:
     build: ./apps/frontend
     environment:
       - NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
     ports:
       - "4200:4200"
   ```

## Quick Database Query Helpers

### Find your organization ID locally:
```sql
SELECT id, name FROM "Organization";
```

### Check existing TikTok integrations:
```sql
SELECT id, name, "providerIdentifier", "organizationId" 
FROM "Integration" 
WHERE "providerIdentifier" = 'tiktok' AND "deletedAt" IS NULL;
```

### Update organization ID if needed:
```sql
UPDATE "Integration" 
SET "organizationId" = 'your-local-org-id'
WHERE id = 'your-integration-id';
```

## Recommendation

**I recommend Option 2 (Re-authenticate)** because:
- ✅ Simplest and most reliable
- ✅ No risk of token expiration issues
- ✅ Ensures all tokens are fresh
- ✅ No database migration complexity

The authentication process is quick and you'll have a fresh token that's guaranteed to work.
