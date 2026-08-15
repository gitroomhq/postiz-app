# Manual verification — `GET /public/v1/integrations/:id/tiktok/creator-info`

This repo has no working test harness at the pinned tag (`v2.21.9`): `jest.config.ts`
imports `getJestProjects` from `@nx/jest`, but neither `nx.json` nor an `@nx/*`
package exists anywhere in the workspace, and there are zero `*.spec.ts` /
`*.test.ts` files in the entire repo (verified by full-repo search before writing
this patch). `pnpm test` fails immediately on `Cannot find module '@nx/jest'`.
Because there is no usable/functional test runner to add real coverage to,
this file documents the manual verification steps instead, per PR-1 task 1.3.

## Prerequisites

- A running self-hosted Postiz instance built from this branch
  (`feat/creator-info-endpoint`), pointed at a database with at least one
  **connected, non-expired TikTok integration**.
- A valid Postiz API key for the organization that owns that integration
  (Settings → API keys in the Postiz dashboard, or `Organization.apiKey` /
  the OAuth `pos_` token flow — see `public.auth.middleware.ts`).
- The TikTok `integrationId` (UUID) for that connected channel. Get it via
  the existing, already-working route:

```bash
curl -s \
  -H "Authorization: $POSTIZ_API_KEY" \
  "$POSTIZ_BASE_URL/public/v1/integrations" | jq '.[] | select(.identifier=="tiktok")'
```

## Test 1 — 401 without API key

```bash
curl -i "$POSTIZ_BASE_URL/public/v1/integrations/$INTEGRATION_ID/tiktok/creator-info"
```

Expected: `HTTP/1.1 401 Unauthorized`, body `{"msg":"No API Key found"}`
(handled by `PublicAuthMiddleware`, applied to the whole
`PublicIntegrationsController` — no per-route change needed).

## Test 2 — 200 with valid key + real connected TikTok channel

```bash
curl -i \
  -H "Authorization: $POSTIZ_API_KEY" \
  "$POSTIZ_BASE_URL/public/v1/integrations/$INTEGRATION_ID/tiktok/creator-info"
```

Expected: `HTTP/1.1 200 OK`, JSON body matching the `TikTokCreatorInfo` DTO:

```json
{
  "nickname": "some_creator_handle",
  "privacyLevelOptions": ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"],
  "duetDisabled": false,
  "stitchDisabled": false,
  "commentDisabled": false,
  "maxVideoPostDurationSec": 300
}
```

Checklist while inspecting the response:

- [ ] `privacyLevelOptions` is a non-empty array sourced from the live TikTok
      response (not hardcoded) — cross-check against what the TikTok mobile
      app / Creator Portal shows as available privacy options for this
      specific creator.
- [ ] `duetDisabled` / `stitchDisabled` / `commentDisabled` reflect the
      creator's actual TikTok settings (toggle one in the TikTok app,
      re-run the curl, confirm the flag flips).
- [ ] `maxVideoPostDurationSec` is a sane positive integer (matches the
      creator's account tier).
- [ ] No `nickname`/options field is silently defaulted when TikTok returns
      a non-`ok` `error.code` — instead the route must respond with a
      `502 {"msg":"Failed to fetch TikTok creator info"}` (see Test 3).

## Test 3 — non-TikTok integration id

```bash
curl -i \
  -H "Authorization: $POSTIZ_API_KEY" \
  "$POSTIZ_BASE_URL/public/v1/integrations/$LINKEDIN_INTEGRATION_ID/tiktok/creator-info"
```

Expected: `HTTP/1.1 400 Bad Request`,
`{"msg":"Integration is not a TikTok channel"}`.

## Test 4 — unknown integration id

```bash
curl -i \
  -H "Authorization: $POSTIZ_API_KEY" \
  "$POSTIZ_BASE_URL/public/v1/integrations/00000000-0000-0000-0000-000000000000/tiktok/creator-info"
```

Expected: `HTTP/1.1 404 Not Found`, `{"msg":"Integration not found"}`.

## Test 5 — expired token / refresh path (best-effort, not always reproducible)

If the connected TikTok token is expired at the time of the call, the route
should transparently refresh via `RefreshIntegrationService` (same pattern as
`triggerIntegrationTool` in this controller) and retry once with the new
access token, or return `401 {"msg":"Channel disconnected due to expired
token"}` if the refresh itself fails. This is not easily forced on demand;
note the actual observed behavior in the PR description if/when it happens
naturally during the sign-off window (task 1.3 in `sdd/canales-pretramite/tasks`).

## Sign-off

This checklist (or equivalent evidence: response bodies/screenshots) MUST be
attached to the PR-1 description before merge — this is a required manual
sign-off step, not a CI gate (task 1.3), and is separate from the AGPL
compliance sign-off gate (task 1.4, blocks VM deploy specifically, not the
branch/PR itself).
