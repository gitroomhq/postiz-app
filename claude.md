# Postiz SSO Integration - Trusted Headers Mode

## Project Status: 95% Complete - Ready for User Creation

### Branch: `feature/trusted-headers-sso`

## Overview
Implementing SSO (Single Sign-On) integration for Postiz using Traefik + Authelia with trusted headers mode. This allows users to authenticate through Authelia, which then passes authentication headers to Postiz.

## Architecture

```
User → Traefik (Port 8443) → Authelia (auth middleware) → Postiz
                   ↓
              Sets Remote-* headers
```

## What's Working

### 1. Authentication Flow (95% Complete)
- ✅ Traefik reverse proxy with TLS (HTTPS)
- ✅ Authelia v4.38 authentication server
- ✅ ForwardAuth middleware integration
- ✅ Trusted header forwarding (`Remote-Email`, `Remote-User`, `Remote-Name`)
- ✅ Backend SSO middleware detecting and processing headers
- ✅ Frontend middleware bypassing auth checks when SSO enabled
- ⚠️  User must exist in Postiz database (needs initial setup)

### 2. Configuration
- ✅ Docker Compose stack with all services
- ✅ SSL certificates generated with mkcert for `*.dev.test` domains
- ✅ Proper subdomain routing (postiz.dev.test, auth.dev.test, traefik.dev.test)
- ✅ Environment variables configured for SSO mode
- ✅ Authelia session management with Redis

### 3. Development Environment
- ✅ Local development setup at `https://postiz.dev.test:8443`
- ✅ LAN access configured for `172.16.3.201`
- ✅ Test user credentials: `testuser` / `password`

## Current Issue & Solution

### Issue: Refresh Loop After Login
**Symptom**: User authenticates through Authelia successfully, but Postiz enters a redirect loop.

**Root Cause**: User `testuser@example.com` doesn't exist in Postiz database.

**Evidence**:
```
[SSO] Trusted headers detected: {
[SSO] User not found or not activated, continuing to normal auth
```

**Solution**: Create the user in Postiz database first:
1. Option A: Temporarily disable SSO, register user with email `testuser@example.com`, re-enable SSO
2. Option B: Manually insert user into database
3. Option C: Implement SSO auto-user-creation (requires code changes)

## Files Modified

### Backend Changes (`apps/backend/src/api/routes/auth.controller.ts`)
**Location**: Line 1-89 (SSO middleware section)

**Key Changes**:
- Added SSO middleware that runs before normal auth middleware
- Detects `Remote-Email`, `Remote-User`, `Remote-Name` headers
- Looks up user by email from trusted headers
- Sets auth cookie if user found and activated
- Falls through to normal auth if SSO user not found

**Environment Variables Used**:
- `ENABLE_SSO=true` - Enables SSO mode
- `SSO_TRUST_PROXY=true` - Trusts headers from proxy
- `SSO_MODE=trusted-headers` - Uses header-based SSO
- `SSO_HEADER_EMAIL=remote-email` - Header containing email
- `SSO_HEADER_NAME=remote-name` - Header containing display name
- `SSO_HEADER_USER=remote-user` - Header containing username
- `SSO_DEFAULT_ORG_STRATEGY=first-active` - Assigns user to first active org

### Frontend Changes (`apps/frontend/src/middleware.ts`)
**Location**: Lines 68-72

**Key Change**:
```typescript
// SSO INTEGRATION: When SSO is enabled, disable frontend auth checks
// Let the reverse proxy (Traefik + Authelia) and backend middleware handle authentication
const enableSSO = process.env.ENABLE_SSO === 'true';

if (nextUrl.href.indexOf('/auth') === -1 && !authCookie && !enableSSO) {
  // ... redirect to auth
}
```

**Why This Works**:
- Frontend middleware runs on ALL requests (including client-side navigations)
- SSO headers only exist on initial server requests through Traefik
- Bypassing frontend checks allows backend to handle SSO properly
- Backend sets the auth cookie after successful SSO authentication

## Docker Compose Configuration

### Services
1. **Traefik** (traefik:v3.0)
   - Ports: 8080 (HTTP), 8443 (HTTPS), 8082 (Dashboard)
   - Handles TLS termination
   - Routes traffic to Authelia and Postiz

2. **Authelia** (authelia/authelia:4.38)
   - Port: 9091 (internal)
   - File-based authentication
   - Session storage in Redis
   - TOTP 2FA support (optional)

3. **Postiz** (postiz-custom:latest)
   - Port: 5000 (internal)
   - Custom build with SSO support
   - Protected by Authelia middleware

4. **PostgreSQL** (postgres:17-alpine)
   - Port: 5432 (internal)
   - Postiz database

5. **Redis** (redis:7.2-alpine)
   - Port: 6379 (internal)
   - Authelia session storage

### Network Configuration
- Network: `postiz-dev-network` (bridge)
- All services communicate internally
- Only Traefik exposes external ports

## Access Information

### Local Access (on master machine)
- **URL**: `https://postiz.dev.test:8443`
- **Authelia**: `https://auth.dev.test:8443` or `https://postiz.dev.test:8443/auth`
- **Traefik Dashboard**: `http://localhost:8082`

### LAN Access (from other devices)
Add to `/etc/hosts` (Linux/Mac) or `C:\Windows\System32\drivers\etc\hosts` (Windows):
```
172.16.3.201  postiz.dev.test
172.16.3.201  auth.dev.test
172.16.3.201  traefik.dev.test
```

Then access via: `https://postiz.dev.test:8443`

### Test Credentials
- **Username**: `testuser`
- **Password**: `password`
- **Email**: `testuser@example.com`

## SSL Certificates

Generated using mkcert:
```bash
cd ~/postiz-dev-sso/traefik/certs
mkcert postiz.dev.test auth.dev.test traefik.dev.test
```

Certificates:
- `postiz.dev.test+2.pem` (cert)
- `postiz.dev.test+2-key.pem` (key)
- Valid until: February 3, 2028

## Testing the Flow

### Expected Behavior
1. Navigate to `https://postiz.dev.test:8443`
2. Traefik intercepts request, forwards to Authelia for auth check
3. No valid Authelia session → Redirect to Authelia login
4. User enters credentials: `testuser` / `password`
5. Authelia authenticates, creates session, redirects back to Postiz
6. Traefik forwards request with `Remote-*` headers
7. Postiz backend SSO middleware:
   - Detects headers
   - Looks up user by `testuser@example.com`
   - **Currently**: User not found → redirect loop
   - **After fix**: Sets auth cookie → redirect to `/launches`

### Current Behavior (Needs Fix)
Steps 1-6 work perfectly. Step 7 fails because user doesn't exist in database.

## Next Steps

### Immediate (To Fix Refresh Loop)
1. Create user `testuser@example.com` in Postiz database:
   - Method A: Temporarily set `ENABLE_SSO=false`, register through UI, set back to `true`
   - Method B: Direct database insertion
2. Test full SSO flow
3. Verify auth cookie is set
4. Confirm redirect to `/launches` works

### Future Enhancements
1. Implement auto-user creation on first SSO login
2. Add user attribute mapping (groups → organizations)
3. Support OIDC providers (not just header-based)
4. Add SSO configuration UI in admin panel
5. Document production deployment steps

## Development Setup

### Building Custom Postiz Image
```bash
cd ~/postiz-app-fork
docker build --build-arg NEXT_PUBLIC_VERSION=custom-sso -t postiz-custom:latest -f Dockerfile.dev .
```

### Starting the Stack
```bash
cd ~/postiz-dev-sso
docker compose up -d
```

### Checking Logs
```bash
# All services
docker compose logs -f

# Specific service
docker logs postiz-dev -f
docker logs postiz-dev-authelia -f
docker logs postiz-dev-traefik -f
```

### Stopping the Stack
```bash
cd ~/postiz-dev-sso
docker compose down
```

## Troubleshooting

### Issue: Redirect Loop
**Check**: Do logs show "User not found or not activated"?
**Fix**: Create user in database with matching email

### Issue: Headers Not Forwarded
**Check**: Traefik labels in docker-compose.yml
**Fix**: Ensure `authelia@docker` middleware is applied to postiz router

### Issue: SSL Certificate Errors
**Check**: Are you accessing via correct domain?
**Fix**: Use `*.dev.test` domains, not IP addresses or localhost

### Issue: Authelia Login Not Showing
**Check**: Is Authelia service healthy?
**Fix**: `docker compose ps` and check Authelia container status

## Production Considerations

### Security
- ✅ Use real SSL certificates (Let's Encrypt)
- ✅ Change all default secrets/passwords
- ✅ Enable TOTP 2FA in Authelia
- ✅ Use PostgreSQL backend for Authelia (not file-based)
- ✅ Implement proper logging and monitoring
- ✅ Configure rate limiting
- ✅ Use secure session settings

### Scalability
- ✅ Redis cluster for session storage
- ✅ Load balancer for multiple Postiz instances
- ✅ Separate Authelia instance per environment
- ✅ Database connection pooling

### Monitoring
- ✅ Traefik metrics
- ✅ Authelia logs
- ✅ Postiz SSO metrics
- ✅ Alert on authentication failures

## References

- [Traefik ForwardAuth Documentation](https://doc.traefik.io/traefik/middlewares/http/forwardauth/)
- [Authelia Documentation](https://www.authelia.com/integration/proxies/traefik/)
- [Postiz GitHub](https://github.com/gitroomhq/postiz-app)

## Contributors
- Claude (AI Assistant) - SSO Implementation
- Alex - Project Lead & Testing

---

**Last Updated**: 2025-11-03
**Status**: Ready for user creation and final testing
