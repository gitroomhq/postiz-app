# User authentication token isolation (F01)

A password-reset link previously carried a JWT that the login middleware also accepted. Its custom `expires` field was checked only by the reset handler, not session authentication. This change separates the three user-token purposes and rejects all legacy user-authentication tokens.

## Behavior

- Session, password-reset and activation tokens have distinct signing keys derived with HMAC-SHA256 from the existing secret and a versioned purpose label. They require HS256, the expected issuer/audience/purpose, a subject, grant ID and standard expiry.
- Session lifetime remains 365 days, matching existing cookies. This is a finite compatibility choice, not a new refresh-token system. Resets expire in 20 minutes; activation links in 24 hours.
- Only token digests are stored in the new `UserAuthToken` table. A valid signature without a matching unexpired database record is insufficient.
- Reset/activation redemption is atomic. A successful reset changes the password and deletes all of that user's token grants in the same transaction. Concurrent attempts with the same link or different outstanding reset links cannot both succeed.
- JWTs contain a keyed digest of current credentials, never the password or password hash itself. This invalidates a session issued with stale credentials by a login racing a password reset. Credential swaps/email/provider changes also require reauthentication.
- Logout deletes only the current session grant. Other devices remain logged in unless the password is reset. The browser button calls the API even with `NOT_SECURED` enabled; the `/auth/logout` route also requests revocation.
- Current user activation, deletion and authorization are checked from the database. Role claims are not trusted.
- Existing integration/invitation/enterprise JWT helpers and encrypted credential formats remain unchanged. Those are separate token domains.

## Rollout — required before running the new backend

1. Back up the database and schedule a coordinated backend rollout. This intentionally logs everyone out and invalidates outstanding legacy reset/activation links. Inactive users must request a fresh activation email; reset users must request a fresh reset email. No legacy-token fallback is included.
2. Apply the additive table/index/foreign-key SQL once through your normal database-change process: `libraries/nestjs-libraries/src/database/prisma/user-auth-tokens.sql`. Deployments that already reconcile this schema with `prisma db push` can use their existing reviewed process instead. Do not run both blindly. This repository does not have a baseline Prisma migration history, so this SQL is not presented as a standalone `migrate deploy` history.
3. Generate the client with `pnpm exec prisma generate --schema libraries/nestjs-libraries/src/database/prisma/schema.prisma`, then build/deploy every backend instance. The new backend requires the table; avoid a mixed old/new backend period. Old instances still contain the original vulnerability.
4. Keep the existing `JWT_SECRET`. It also decrypts persisted integration credentials: changing it is a separate key/data migration, not a safe shortcut for this fix. Startup rejects an absent/blank secret, but does not newly require existing secrets to have a different length.
5. Verify login, activation, reset and logout with a local/staging test account, including multiple browser sessions. The new JWT payload is minimal, so external clients must treat it as an opaque credential rather than expecting a full User row.
6. Expired rows are opportunistically deleted for a user when another grant is issued. Include a scheduled, bounded cleanup of expired `UserAuthToken` rows in production housekeeping; dormant accounts otherwise retain expired rows. Deleting a row whose `expiresAt` has passed is safe and does not affect active sessions.

Do not roll back to the vulnerable backend as a security mitigation. An emergency code rollback can leave the additive table in place, but legacy acceptance returns and new sessions will not authenticate on the old code. No deployed database was changed during implementation; tests used a disposable PostgreSQL container only.

## Minimal private report

**Title:** Password-reset tokens can be used to log in

**Description:** A password-reset token is accepted as a login token, even after its intended 20-minute expiry. Someone with an old reset link could access an activated account.

**Expected:** Reset tokens should only reset passwords, expire after 20 minutes, and work once.

Submit privately through the channel in `SECURITY.md` with the reproduction and observed results. No public GitHub issue was created.

## Reproduce without an application account

From the repository root, with dependencies installed:

```sh
pnpm exec jest --config jest.auth.config.cjs --runInBand \
  --runTestsByPath libraries/helpers/src/auth/auth.service.auth.spec.ts
```

The test named **“reproduces the legacy reset-as-session defect without real credentials”** signs a synthetic reset payload using a dummy test key and a deadline in the year 2000. The unchanged legacy verifier accepts its user ID, exactly the missing-purpose/expiry check in the old middleware. The new session verifier rejects it. No real secrets, email, network calls or production accounts are needed.

This is an isolated regression reproduction, not a claim that a complete old HTTP deployment was exercised. The database suite below also invokes the actual new middleware and proves reset rejection and session acceptance.

## Reproduce through a local HTTP deployment

Use only your own disposable, activated local account. For the vulnerable behavior, use the original revision in a separate checkout/container; do not downgrade a deployed service. Configure a local email sink/provider to receive reset emails. For the fixed behavior, apply the additive schema first and run the new backend.

1. Log in and confirm the test account can access `/user/self` normally.
2. Request a password-reset email through the UI, or send `POST /auth/forgot` with JSON `{ "email": "your-local-test-account@example.com" }`.
3. Copy only the token after `/auth/forgot/` in the emailed link. Do not redeem it yet.
4. Supply that reset token as the `auth` header to `GET /user/self`, without login cookies. For example, in Bash:

```sh
BASE_URL=http://localhost:3000
read -r -s -p 'Paste the local reset token: ' RESET_TOKEN
printf '\n'
curl --silent --show-error --include \
  --header "auth: ${RESET_TOKEN}" \
  "${BASE_URL}/user/self"
unset RESET_TOKEN
```

If using the local frontend proxy instead, set `BASE_URL` to its `/api` base. Use a local test token only: a token passed in a command argument may be visible to other local processes.

5. **Before the fix:** expect HTTP 200 and the test account's user details. After 20 minutes, the reset handler should reject the link but the old session middleware still accepts it. The synthetic test verifies the expired case immediately without waiting.
6. **After the fix:** expect HTTP 401 through the existing exception filter. The reset or activation token must never authenticate `/user/self`, whether fresh or expired.
7. Request a fresh reset link on the fixed backend. Submit it through the reset UI: first use succeeds; replay returns `reset: false`. A saved pre-reset login token should now get HTTP 401; logging in with the new password should succeed.
8. Log in in two sessions. Log out in the first, then retry its saved token: expect HTTP 401. The second session remains valid. Reset the password: both previous sessions must be invalid.
9. Register an account requiring email activation. Its email token cannot access `/user/self`. Activating once returns a new session; replaying the link or presenting a reset/session token to `/auth/activate` must fail.

Do not paste live tokens or account data into an issue. Record status codes and redact credentials.

## PostgreSQL-backed regression suite

The suite refuses a database URL unless it is loopback, has username `f01_test`, and database name `postiz_auth_test`. It does not load `.env` in Jest. Use a disposable database, not an existing database renamed to satisfy these checks.

```sh
docker run --detach --rm --name postiz-auth-test \
  -e POSTGRES_USER=f01_test -e POSTGRES_PASSWORD=f01_test_only \
  -e POSTGRES_DB=postiz_auth_test -p 127.0.0.1:55439:5432 postgres:17-alpine

# Wait until this reports that the disposable server is accepting connections:
docker exec postiz-auth-test pg_isready -U f01_test -d postiz_auth_test

export AUTH_TEST_DATABASE_URL='postgresql://f01_test:f01_test_only@127.0.0.1:55439/postiz_auth_test'
DATABASE_URL="$AUTH_TEST_DATABASE_URL" pnpm exec prisma db push \
  --schema libraries/nestjs-libraries/src/database/prisma/schema.prisma --skip-generate
pnpm exec jest --config jest.auth.config.cjs --runInBand

docker stop postiz-auth-test
unset AUTH_TEST_DATABASE_URL
```

An explicitly scoped `DATABASE_URL` overrides dotenv only for the disposable schema command. Tests exercise real PostgreSQL transactions, replay, concurrent redemption, rollback after a simulated grant-deletion failure, stale credentials, persisted expiry, registration/activation/login composition and middleware rejection. Email/provider/organization collaborators are mocked; this is not a full browser/SMTP/Temporal end-to-end run.

Run the focused config because the existing root Jest config still imports missing `@nx/jest`. Repairing unrelated test/lint infrastructure is outside this fix.

## Implementation verification

- Focused Jest suite: 22 tests, including real PostgreSQL-backed transactions and the actual auth middleware.
- Backend and frontend TypeScript checks pass with `--noEmit --incremental false`.
- An isolated database initialized from the original schema accepted the additive SQL; Prisma's subsequent schema diff reported no differences.
- ESLint was attempted from the root but still fails to load the existing configuration (`Converting circular structure to JSON`). It did not validate these files.
- No live deployment or full browser/SMTP/Temporal end-to-end test was performed. Reproduction instructions above are for a local test account.
