# ✅ GBP Database Configuration - Complete Setup Guide

## Summary
The Google Business Profile (GBP) provider has been successfully modified to read OAuth credentials from the database instead of environment variables. This allows per-organization configuration and eliminates the need for environment variables.

---

## 🎯 What Was Accomplished

### 1. Modified GBP Provider
**File:** `/home/faizan/Development/postiz-app/libraries/nestjs-libraries/src/integrations/social/gbp.provider.ts`

**Changes Made:**
- ✅ Added `config` property with environment variable fallback
- ✅ Converted `REDIRECT_URI` to a getter using the config
- ✅ Updated all credential references to use `this.config.*` (4 locations)
- ✅ Added `setConfig()` method for database integration

**Code Structure:**
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

### 2. Updated Database Schema
**File:** `/home/faizan/Development/postiz-app/libraries/nestjs-libraries/src/database/prisma/schema.prisma`

**Change:** Added unique constraint to `SocialMediaPlatformConfig` model
```prisma
@@unique([platformKey, organizationId, customerId])
```

### 3. Created Configuration Scripts
- ✅ `/home/faizan/Development/postiz-app/scripts/gbp-config-runner.js` - Automatic setup script
- ✅ `/home/faizan/Development/postiz-app/scripts/verify-gbp-config.js` - Verification script
- ✅ `/home/faizan/Development/postiz-app/add-gbp-config.sql` - SQL alternative
- ✅ `/home/faizan/Development/postiz-app/GBP_DATABASE_CONFIG.md` - Technical documentation

---

## 📋 Complete Setup Steps Executed

### Step 1: ✅ Database Setup
- Started PostgreSQL and Redis containers
- Generated Prisma client
- Pushed database schema

### Step 2: ✅ Configuration Added
Executed: `node scripts/gbp-config-runner.js`

**Result:**
```
✅ Found organization: Default Organization (1bb65590-bc45-4a2f-887a-170fdb637971)
✅ Created/updated GBP config with ID: 325b0045-505f-4b8d-aa44-860f5d352a29
  ✓ Configured: GOOGLE_CLIENT_ID
  ✓ Configured: GOOGLE_CLIENT_SECRET
  ✓ Configured: FRONTEND_URL
```

### Step 3: ✅ Verification
Executed: `node scripts/verify-gbp-config.js`

**Result:**
```
✅ Found 1 GBP configuration(s):
  Platform: Google Business Profile
  Platform Key: GBP
  Organization ID: 1bb65590-bc45-4a2f-887a-170fdb637971
  Customer ID: null

Config Items:
  • GOOGLE_CLIENT_ID: 662105185459-4k52hkttqersqt221jra9g0j22jlumiu.apps.googleusercontent.com
  • GOOGLE_CLIENT_SECRET: GOCSPX-3wd...
  • FRONTEND_URL: http://localhost:4200
```

---

## 🔧 How It Works

### Database Configuration Flow
1. **Provider Initialization**: GBP provider is instantiated with default config (fallback to env vars)
2. **Integration Manager**: When `getSocialIntegration()` is called:
   - Fetches platform config from database via `SocialMediaPlatformConfigService`
   - Calls `setConfig()` on the provider with database values
   - Provider overrides config with database values
3. **Authentication**: Provider uses database credentials instead of environment variables

### Configuration Storage

**Table: SocialMediaPlatformConfig**
- `id`: 325b0045-505f-4b8d-aa44-860f5d352a29
- `platform`: "Google Business Profile"
- `platformKey`: "GBP"
- `organizationId`: 1bb65590-bc45-4a2f-887a-170fdb637971
- `customerId`: null

**Table: SocialMediaPlatformConfigItem**
| key | value |
|-----|-------|
| GOOGLE_CLIENT_ID | 662105185459-4k52hkttqersqt221jra9g0j22jlumiu.apps.googleusercontent.com |
| GOOGLE_CLIENT_SECRET | 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 |
| FRONTEND_URL | http://localhost:4200 |

---

## 🚀 Next Steps

### Start the Application
```bash
npm run dev
```

### Test GBP Integration
1. Open browser to `http://localhost:4200`
2. Navigate to Integrations page
3. Find "Google Business Profile" integration
4. Click "Connect" or "Add"
5. Complete OAuth flow

### Expected Behavior
During authentication, you should see logs like:
```
✅ Using APPROVED GBP API credentials
🏢 Account ID: [your-account-id]
📍 Location ID: [your-location-id]
🌐 Using GMB API v4 URL: https://mybusiness.googleapis.com/v4/accounts/...
```

---

## 📊 Benefits Achieved

✅ **No environment variables required** - Credentials stored in database
✅ **Per-organization configuration** - Different orgs can use different credentials
✅ **Admin UI integration** - Can be managed through existing platform config UI
✅ **Backwards compatible** - Falls back to env vars if database config not found
✅ **Follows existing patterns** - Matches how X, LinkedIn, Facebook providers work
✅ **Easy management** - Configure via API or admin interface

---

## 🔍 Troubleshooting

### If Configuration Not Found
```bash
node scripts/gbp-config-runner.js
```

### To Verify Configuration
```bash
node scripts/verify-gbp-config.js
```

### Manual Database Check
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

---

## 🗂️ Files Modified/Created

### Modified (Committed)
- `/home/faizan/Development/postiz-app/libraries/nestjs-libraries/src/integrations/social/gbp.provider.ts`
- `/home/faizan/Development/postiz-app/libraries/nestjs-libraries/src/database/prisma/schema.prisma`

### Created (Uncommitted)
- `/home/faizan/Development/postiz-app/scripts/gbp-config-runner.js`
- `/home/faizan/Development/postiz-app/scripts/verify-gbp-config.js`
- `/home/faizan/Development/postiz-app/add-gbp-config.sql`
- `/home/faizan/Development/postiz-app/GBP_DATABASE_CONFIG.md`
- `/home/faizan/Development/postiz-app/GBP_SETUP_COMPLETE.md`

---

## 🎉 Success!

The GBP provider now reads OAuth credentials from the database instead of environment variables. This provides:
- Better security (no credentials in .env files)
- Better manageability (configure via UI/API)
- Better scalability (per-org configuration)

**Setup is complete and ready for testing!**

---

## 📞 Support

If you encounter issues:
1. Run verification script: `node scripts/verify-gbp-config.js`
2. Check logs during GBP authentication
3. Verify database records exist
4. Review configuration loading in `integration.manager.ts`

**Date Completed:** 2025-11-10
**Organization Used:** Default Organization (1bb65590-bc45-4a2f-887a-170fdb637971)
