# Facebook OAuth Error Fix - Summary

## Problem
Facebook page posts were failing with error:
```
(#200) Unpublished posts must be posted to a page as the page itself.
```

## Root Cause
When Facebook page tokens expired and were refreshed:
1. The system correctly stored the page access token initially
2. When tokens expired, `refreshToken()` was called with the user token
3. **BUG**: Facebook's token exchange returned a new USER token
4. The provider incorrectly returned this USER token as the access token
5. System stored the user token for posting
6. Posts failed because user tokens cannot post to pages

## Solution Implemented

### 1. Modified Token Storage Format
Changed the `refreshToken` field to store both user token and page ID:
- **Old format**: `<user_token>`
- **New format**: `<user_token>::<page_id>`

### 2. Updated Files

#### `libraries/nestjs-libraries/src/integrations/social/facebook.provider.ts`
- **`refreshToken()` method**: Now parses the token format, exchanges user token, then fetches the fresh page token
- **`reConnect()` method**: Updated to store tokens in new format

#### `libraries/nestjs-libraries/src/database/prisma/integrations/integration.service.ts`
- **`saveFacebook()` method**: Updated to store tokens in format `userToken::pageId`

### 3. Migration Script
Created `fix-facebook-tokens.ts` to update existing Facebook integrations to the new format.

## Migration Results
✅ Successfully migrated **12 Facebook integrations**:
- Excel Hospital
- Reshambai Hospital
- Upstrapp Inc.
- Al-Khalil Tours & Travels - Hajj and Umrah
- Amanahexpressinternational
- Khatoon Matrimonial
- Gear Z Creatives
- Perfect Dental Wellbeing
- AT-Tarbiyyah Islamic English School
- Labhjewellers.sonal
- Pizza Junction Ahmedabad
- Ahmedabadayurvedclinic

## Build Status
✅ Application built successfully
- Backend: ✓
- Frontend: ✓
- Workers: ✓
- Cron: ✓

## Next Steps to Deploy

### Option 1: If Running in Development Mode
```bash
npm run dev
```

### Option 2: If Running in Production Mode
```bash
npm run start:production
```

Or start services individually:
```bash
# Terminal 1 - Backend
npm run start:prod

# Terminal 2 - Frontend
npm run start:prod:frontend

# Terminal 3 - Workers
npm run start:prod:workers

# Terminal 4 - Cron
npm run start:prod:cron
```

### Option 3: If Using Docker
```bash
# Rebuild and restart containers
docker-compose down
docker-compose up -d --build
```

### Option 4: If Using PM2 or other process manager
Restart your process manager to pick up the new builds.

## Testing the Fix

1. **Restart the application** using one of the methods above
2. **Try posting** to any of the affected Facebook pages
3. **Monitor logs** - you should no longer see the OAuth error
4. **If still seeing issues** with a specific page:
   - Go to Integrations/Channels
   - Disconnect the Facebook page
   - Reconnect the Facebook page
   - This ensures the new token format is applied

## Technical Details

### How Token Refresh Works Now
1. System detects token expiration
2. Calls `refreshToken()` with format: `userToken::pageId`
3. Provider parses the format:
   - Extracts user token
   - Extracts page ID
4. Exchanges user token with Facebook for new user token
5. Uses new user token to fetch fresh page access token
6. Returns:
   - `accessToken`: Fresh page token (for posting)
   - `refreshToken`: `newUserToken::pageId` (for next refresh)

### Backward Compatibility
The `refreshToken()` method includes fallback handling for old token formats, ensuring a smooth transition.

## Files Changed
- `libraries/nestjs-libraries/src/integrations/social/facebook.provider.ts`
- `libraries/nestjs-libraries/src/database/prisma/integrations/integration.service.ts`
- `fix-facebook-tokens.ts` (migration script - can be deleted after deployment)

## Verification
To verify the fix is working:
```bash
# Check the database for updated tokens
# They should now contain "::" separator
```

---
**Date**: 2025-11-26
**Status**: ✅ Complete - Ready for deployment
