# Google Business Profile Integration - Testing Guide

## ✅ RESOLVED: Using Approved GBP API Credentials

**Status**: Your application now uses the **APPROVED** Google Business Profile API credentials:
- Client ID: `662105185459-4k52hkttqersqt221jra9g0j22jlumiu.apps.googleusercontent.com`
- Client Secret: `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`

## 🔧 Key Changes Made

### 1. Updated OAuth Scopes
```typescript
scopes = [
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/plus.business.manage'  // Added for GMB v4 API
];
```

### 2. Fixed API Endpoint
**Before (causing 404):**
```
https://mybusinessbusinessinformation.googleapis.com/v1/locations/1151483555897051544/localPosts
```

**After (correct for approved clients):**
```
https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/localPosts
```

### 3. Enhanced Error Handling
- ✅ Specific error messages for different HTTP status codes
- ✅ Proper authentication flow validation
- ✅ Detailed logging for debugging

## 🧪 Testing Steps

### Step 1: Re-authenticate GBP Integration
1. **Delete existing GBP connections** in your app
2. **Re-connect Google Business Profile** to use new scopes
3. **Complete OAuth flow** with approved credentials

### Step 2: Verify Connection
Look for these log messages:
```
✅ Using APPROVED GBP API credentials
🏢 Account ID: [your-account-id]
📍 Location ID: [your-location-id]
🌐 Using GMB API v4 URL: https://mybusiness.googleapis.com/v4/accounts/...
```

### Step 3: Test Posting
1. **Create a test post** in your application
2. **Check console logs** for detailed API interaction
3. **Verify post appears** in Google Business Profile

## 🔍 Debug Information

### Success Indicators
- ✅ `📊 Response status: 200`
- ✅ `🎉 GBP Post Success!`
- ✅ Post appears in Google Business Profile dashboard

### Common Issues & Solutions

#### Issue: Authentication Error (401)
**Cause**: Token expired or invalid
**Solution**: Re-authenticate the GBP integration

#### Issue: Access Denied (403)  
**Cause**: Account doesn't have posting permissions
**Solution**: Verify business ownership in Google Business Profile

#### Issue: Location Not Found (404)
**Cause**: Location ID is incorrect or business not verified
**Solution**: Check business verification status

#### Issue: Invalid Post Data (400)
**Cause**: Post content violates GBP guidelines
**Solution**: Review post content and GBP posting policies

## 📊 Expected API Flow

### 1. Authentication
```
POST https://oauth2.googleapis.com/token
✅ Get access token with approved credentials
```

### 2. Get Account Info
```
GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts
✅ Retrieve account ID
```

### 3. Get Locations
```
GET https://mybusinessbusinessinformation.googleapis.com/v1/accounts/{account}/locations
✅ Retrieve location information
```

### 4. Create Post
```
POST https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/localPosts
✅ Create post using GMB API v4
```

## 🚀 Next Steps

### Immediate Testing
1. **Restart your application** to load the updated code
2. **Test with a real business location** that you own/manage
3. **Monitor console logs** for detailed API interactions

### Production Deployment
1. **Verify all environment variables** are correctly set
2. **Test with multiple business locations** if applicable
3. **Monitor error rates** and response times

## 📋 Troubleshooting Checklist

- [ ] ✅ Approved GBP API credentials are in `.env` file
- [ ] ✅ Application has been rebuilt with latest changes
- [ ] ✅ Old GBP connections have been removed/re-authenticated
- [ ] ✅ Business locations are verified in Google Business Profile
- [ ] ✅ Test posts comply with GBP content policies
- [ ] ✅ Console logs show successful API calls

## 📞 Support

If you encounter issues:

1. **Check console logs** for specific error messages
2. **Verify business verification status** in Google Business Profile
3. **Test with a simple text post** first
4. **Ensure posting permissions** are enabled for your business

## 🎯 Success Metrics

**Integration Working When:**
- ✅ Authentication completes without errors
- ✅ Locations are fetched successfully  
- ✅ Posts are created and appear in GBP dashboard
- ✅ No 404 errors in console logs
- ✅ Proper success messages in logs

Your Google Business Profile integration should now work correctly with the approved API credentials!
