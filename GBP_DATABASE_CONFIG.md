# GBP Database Configuration - Implementation Summary

## Overview
The Google Business Profile (GBP) provider has been modified to read OAuth credentials from the database instead of environment variables. This allows per-organization configuration and eliminates the need for environment variables.

## Changes Made

### 1. Modified GBP Provider
**File:** `/home/faizan/Development/postiz-app/libraries/nestjs-libraries/src/integrations/social/gbp.provider.ts`

**Changes:**
- Added `config` property that falls back to environment variables
- Made `REDIRECT_URI` a getter that uses the config
- Updated all credential references to use `this.config.*` instead of `process.env.*`
- Added `setConfig()` method for database-driven configuration

**Key Code:**
```typescript
config = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  FRONTEND_URL: process.env.FRONTEND_URL || '',
};

get REDIRECT_URI() {
  return `${this.config.FRONTEND_URL}/integrations/social/gbp`;
}

setConfig(newConfig: Record<string, string>): void {
  this.config = { ...this.config, ...newConfig };
}
```

### 2. Database Integration
The `IntegrationManager` automatically calls `setConfig()` when a provider is loaded (if configuration exists in the database).

**Flow:**
1. Provider is instantiated
2. `IntegrationManager.getSocialIntegration()` is called
3. It fetches platform config from database via `SocialMediaPlatformConfigService`
4. `setConfig()` is called on the provider with the database values
5. Provider uses database credentials instead of environment variables

### 3. Database Scripts Created

#### Option A: TypeScript Script (Recommended)
**File:** `/home/faizan/Development/postiz-app/scripts/add-gbp-config.ts`

**Run with:**
```bash
npx tsx scripts/add-gbp-config.ts
```

**What it does:**
- Finds the first organization in the database
- Creates/updates GBP platform configuration
- Inserts Google OAuth credentials
- Verifies the configuration

#### Option B: SQL Script
**File:** `/home/faizan/Development/postiz-app/add-gbp-config.sql`

**Run with:**
```bash
psql postgresql://postgres:password@localhost:5432/postiz-db-local -f add-gbp-config.sql
```

**Note:** Replace `YOUR_ORG_ID_HERE` with your actual organization ID

## How It Works

### Before (Environment Variables)
```typescript
private GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
private GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
```

### After (Database Configuration)
```typescript
config = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  FRONTEND_URL: process.env.FRONTEND_URL || '',
};

// IntegrationManager sets this from database
setConfig(newConfig) {
  this.config = { ...this.config, ...newConfig };
}
```

## Database Schema

### SocialMediaPlatformConfig
- `id` (UUID, Primary Key)
- `platform` (String) - "Google Business Profile"
- `platformKey` (String) - "GBP"
- `organizationId` (String, Foreign Key)
- `customerId` (String, Nullable)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### SocialMediaPlatformConfigItem
- `id` (Int, Autoincrement, Primary Key)
- `key` (String) - e.g., "GOOGLE_CLIENT_ID"
- `value` (String) - e.g., "662105185459-..."
- `configId` (Int, Foreign Key)

## Configuration Values

The GBP configuration includes:
1. `GOOGLE_CLIENT_ID`: 662105185459-4k52hkttqersqt221jra9g0j22jlumiu.apps.googleusercontent.com
2. `GOOGLE_CLIENT_SECRET`: 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
3. `FRONTEND_URL`: http://localhost:4200

## Benefits

✅ **No environment variables required** - Credentials stored in database
✅ **Per-organization configuration** - Different orgs can use different credentials
✅ **Admin UI integration** - Can be managed through existing platform config UI
✅ **Backwards compatible** - Falls back to env vars if database config not found
✅ **Follows existing patterns** - Matches how X, LinkedIn, Facebook providers work

## Usage

### For Administrators
1. Run the script to add configuration to database:
   ```bash
   npx tsx scripts/add-gbp-config.ts
   ```

2. Restart the application

3. Users can now connect GBP without needing environment variables

### For Developers
The provider will automatically use database credentials when available:

```typescript
// In your code, when using GBP provider
const gbpProvider = await integrationManager.getSocialIntegration('GBP', orgId, customerId);

// The provider will have database credentials automatically loaded
// No additional code needed - it just works!
```

## Migration from Environment Variables

If you were previously using environment variables:

1. ✅ **Automatic fallback** - The provider will still work with env vars if database config is not found
2. ✅ **No breaking changes** - Existing integrations continue to work
3. ✅ **Gradual migration** - You can migrate organizations one at a time

## Testing

### Verify Configuration in Database
```sql
SELECT
  c."platform",
  c."platformKey",
  i."key",
  i."value"
FROM "SocialMediaPlatformConfig" c
JOIN "SocialMediaPlatformConfigItem" i ON c."id" = i."configId"
WHERE c."platformKey" = 'GBP';
```

### Test Provider Initialization
The provider can be tested by checking logs during GBP authentication:
- No more "process.env.GOOGLE_CLIENT_ID" errors
- Credentials loaded from database successfully
- Fallback to env vars if database config missing

## Troubleshooting

### Configuration Not Found
**Error:** "GBP Configuration not found"
**Solution:** Run the script to create the database configuration

### Environment Variable Fallback
**Log message:** "Using environment variable fallback for GOOGLE_CLIENT_ID"
**Meaning:** Database config not found, using env var (expected during migration)

### Wrong Organization
**Error:** Config created for wrong org
**Solution:** Manually update the configuration or modify the script to use specific org ID

## API Endpoint (Alternative)

You can also manage configuration via API:
```
GET /api/social-media-platform-config/GBP
POST /api/social-media-platform-config/GBP
```

Requires authentication and organization context.

## Files Modified/Created

### Modified
- ✅ `/home/faizan/Development/postiz-app/libraries/nestjs-libraries/src/integrations/social/gbp.provider.ts`

### Created
- ✅ `/home/faizan/Development/postiz-app/scripts/add-gbp-config.ts` (TypeScript script)
- ✅ `/home/faizan/Development/postiz-app/add-gbp-config.sql` (SQL script)
- ✅ `/home/faizan/Development/postiz-app/GBP_DATABASE_CONFIG.md` (This file)

## Next Steps

1. **Run the script** to populate database with credentials
2. **Test GBP authentication** to verify credentials are loaded
3. **Update documentation** to reflect new configuration method
4. **Remove env vars** (optional) once all orgs are migrated

## Support

For issues or questions:
1. Check logs for configuration loading messages
2. Verify database records exist
3. Confirm organization context is correct
4. Review `integration.manager.ts` for config loading logic
