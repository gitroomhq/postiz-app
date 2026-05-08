# Social Integrations — Claude Code Instructions

## Position in Hierarchy

- **Parent:** [`libraries/nestjs-libraries/CLAUDE.md`](../../../CLAUDE.md)
- **Grandparent:** [`/CLAUDE.md`](../../../../../CLAUDE.md)
- **Relevant siblings:**
  - [`src/chat/CLAUDE.md`](../../chat/CLAUDE.md) — IG webhook and HMAC validation; MCP tools that trigger integrations
  - [`src/ai/CLAUDE.md`](../../ai/CLAUDE.md) — encryption (`ENCRYPTION_KEY`) that also protects these tokens
  - [`apps/orchestrator/CLAUDE.md`](../../../../../apps/orchestrator/CLAUDE.md) — activities that call these providers

## What lives here

40+ social media providers. Each provider implements `SocialProvider` (from `social.integrations.interface.ts`) and extends `SocialAbstract` (from `../social.abstract.ts`), with OAuth, refresh token, posting, and error handling.

| Category | Content |
|---|---|
| Native providers | `bluesky`, `dev.to`, `discord`, `dribbble`, `facebook`, `farcaster`, `gmb`, `hashnode`, `instagram`, `instagram.standalone`, `kick`, `lemmy`, `linkedin`, `linkedin.page`, `listmonk`, `mastodon` (2 variants), `medium`, `mewe`, `moltbook`, `nostr`, `pinterest`, `reddit`, `skool`, `slack`, `telegram`, `threads`, `tiktok`, `twitch`, `vk`, `whop`, `wordpress`, `x`, `youtube` |
| Providers via Zernio | `zernio-bluesky`, `zernio-facebook`, `zernio-googlebusiness`, `zernio-instagram`, `zernio-linkedin`, `zernio-pinterest`, `zernio-reddit`, `zernio-snapchat`, `zernio-telegram`, `zernio-threads`, `zernio-tiktok`, `zernio-twitter`, `zernio-youtube` |
| Instagram helpers | `instagram-route.resolver.ts`, `instagram-messaging.service.ts`, `instagram-dm-button.type.ts` |
| Base classes | `../social.abstract.ts` (`SocialAbstract` + `RefreshToken`/`BadBody`/`NotEnoughScopes`), `zernio.base.provider.ts` (base for all Zernio providers) |

## Specific Patterns and Rules

### 1. Every provider extends `SocialAbstract` and implements `SocialProvider`

`SocialAbstract` contract:

- `RefreshToken` (thrown when token is expired)
- `BadBody` (thrown when payload is invalid for the destination)
- `NotEnoughScopes` (thrown when OAuth did not request enough scopes)
- `fetch()` / `handleErrors()` / mention helper, all shared

### 2. `ClientInformation` propagation is MANDATORY in OAuth

The `generateAuthUrl(clientInformation?)` and `authenticate(...)` methods receive `ClientInformation` (from the workspace or active profile) with `clientId`, `clientSecret`, `instanceUrl` (Mastodon/Zernio), and per-profile settings.

**Never hardcode `process.env.X_CLIENT_ID`** inside the provider. Always use `clientInformation.clientId` (with an env fallback only when `clientInformation` is `undefined` — legacy path).

Reason (from auto-memory `feedback_per_profile_credentials.md`): OAuth credentials are **per-profile**, sourced from `Credentials` in the DB. Hardcoding env breaks multi-tenancy.

### 3. Instagram routing via `resolveIgRoute`

Canonical function in `instagram-route.resolver.ts`:

```typescript
import { resolveIgRoute } from '@gitroom/nestjs-libraries/integrations/social/instagram-route.resolver';
const route = await resolveIgRoute(integration, instagramMessagingService);
// route.token, route.host, route.useIgGraph, route.source
```

**Resolution priority**:

1. `providerIdentifier === 'instagram-standalone'` → `IG_LOGIN_GRAPH` (`graph.instagram.com`) + IG User Token from `Integration.token`
2. IG User Token registered in `Credentials.instagramTokens` → `IG_LOGIN_GRAPH`
3. Fallback: `FB_LOGIN_GRAPH` (`graph.facebook.com`) + Page Access Token from `Integration.token`

**Never** hardcode host or token in activities/services that touch IG endpoints (comments, DMs, follow-check, stories, reposts). Reason (from auto-memory `feedback_ig_token_routing.md`): Standard Access via IG Login bypasses App Review — critical for self-hosted deployments.

### 4. Three Meta credential layers (NEVER mix)

| Layer | Source | Use |
|---|---|---|
| **App credentials** (workspace) | `Credentials.clientId/clientSecret`, `instagramAppId/instagramAppSecret`, `threadsAppId/threadsAppSecret` | OAuth (`generateAuthUrl`/`authenticate`) and webhook HMAC validation |
| **Integration token** | `Integration.token` is a Page Access Token (`providerIdentifier='instagram'`) **OR** an IG User Token (`providerIdentifier='instagram-standalone'`) | Posting, comments, refresh |
| **Messaging tokens** (Settings > Credenciais > Instagram) | `Credentials.metaSystemUserToken` + `Credentials.instagramTokens` (per-account JSON) | DM and follow-check activities via the registered IG User Token |

Details: [`docs/architecture/instagram-automations.md`](../../../../../docs/architecture/instagram-automations.md).

## Zernio (formerly Late / getlate.dev)

The [Zernio API](https://docs.zernio.com/llms-full.txt) is an alternative provider for channels that require complex OAuth: TikTok, Pinterest, X, Snapchat, Threads, Bluesky, Reddit, Telegram, Google Business, YouTube, Facebook, Instagram, LinkedIn (13 platforms).

### Architecture

- **Base**: `zernio.base.provider.ts` — `ZernioBaseProvider extends SocialAbstract` with the `Zernio` SDK (`@zernio/node`) and a Redis cache (TTL 5min) for usage stats.
- **Concrete providers**: `zernio-<platform>.provider.ts` — they inherit from `ZernioBaseProvider`, passing `platform`, `platformName`, `charLimit`. Marked with `hiddenFromList = true` (they do not appear under "Add Channel" directly — they enter via "Add Channel > Zernio" or "Send Invite Link > Zernio").
- **Identifier**: `zernio-${platform}` (e.g., `zernio-tiktok`, `zernio-pinterest`).
- **Per-profile API key**: resolved via `clientInformation.instanceUrl` (per-profile override) with org-level fallback controlled by the `shareZernioWithProfiles` flag.

### Supported flows

1. **Add Channel > Zernio**: admin selects an account already connected in their Zernio account.
2. **Send Invite Link > Zernio**: admin generates a per-platform OAuth link for the client to connect — endpoint `POST https://zernio.com/api/v1/platform-invites` (response shape: `{ invite: { inviteUrl, ... } }`).

After the client connects via the invite, the admin returns to "Add Channel > Zernio" and adds the new account.

### Frontend

- Modals: `apps/frontend/src/components/launches/zernio/` (`zernio-account-modal.tsx`, `zernio-invite-modal.tsx`, etc.).

### Why Zernio and not Late

The company fully rebranded Late/getlate.dev → Zernio (same company, new brand). The codebase migrated all providers and naming. There is no longer any `late.*.provider.ts` — only some legacy visual assets in `apps/frontend/public/icons/platforms/late.svg|png`.

## Key File Map

| File | Purpose |
|---|---|
| `../social.abstract.ts` | Base class + error classes (`RefreshToken`, `BadBody`, `NotEnoughScopes`) |
| `social.integrations.interface.ts` | Interfaces (`SocialProvider`, `ClientInformation`, `AuthTokenDetails`, `PostDetails`, `PostResponse`) |
| `instagram.provider.ts` | IG via Facebook Login (Page Access Token, host `graph.facebook.com`) |
| `instagram.standalone.provider.ts` | IG via Instagram Login (IG User Token, host `graph.instagram.com`) — preferred for self-hosted |
| `instagram-route.resolver.ts` | `resolveIgRoute` — picks the correct host/token |
| `instagram-messaging.service.ts` | Registered tokens (Meta System User Token + per-account IG User Tokens) |
| `instagram-dm-button.type.ts` | Types for the follow-gate postback button |
| `zernio.base.provider.ts` | Base for all Zernio providers (Redis cache, helpers) |
| `x.provider.ts` + `x.provider.spec.ts` | X/Twitter — example of a tested provider |

## Common Workflows

### Add a new provider

1. **Spec first** if the provider has non-trivial logic (post formatting, upload retry, response parsing). See `x.provider.spec.ts` as reference.
2. Create `<platform>.provider.ts` extending `SocialAbstract` + `implements SocialProvider`.
3. **OAuth**:
   - `generateAuthUrl(clientInformation?: ClientInformation)` — ALWAYS use `clientInformation.clientId/clientSecret/instanceUrl` (with `process.env` fallback only for legacy, ideally not at all).
   - `authenticate(...)` — same rule.
4. **Post**: `post(...)` with error handling that throws `RefreshToken`/`BadBody`/`NotEnoughScopes` when applicable.
5. **Refresh** (if expiration applies): the refresh method also propagates `ClientInformation`.
6. Register in `IntegrationManager` (`database/prisma/integrations/integration.manager.ts`) with a unique identifier.
7. **Frontend**: icon in `apps/frontend/public/icons/platforms/<provider>.svg`. Settings in `apps/frontend/src/components/launches/providers/<provider>/`.
8. **CHANGELOG.md** under `[Unreleased]`.

### Add a provider via Zernio

1. Create `zernio-<platform>.provider.ts` inheriting from `ZernioBaseProvider`. The constructor passes `(platform, platformName, charLimit)`.
2. Register in `IntegrationManager`.
3. Frontend: already exposed via "Add Channel > Zernio" — common UI.

### OAuth diagnostics

1. Is `clientInformation` arriving? Log it at the start of `generateAuthUrl`.
2. Are you using `clientInformation.clientId` or `process.env.X_CLIENT_ID`? It must be the former.
3. For IG/FB: confirm `instagramAppId`/`instagramAppSecret` or `clientId`/`clientSecret` — depends on which Meta product the app is using.

## Known Pitfalls

1. **Symptom:** OAuth works in one org but fails in another → **Cause:** provider hardcodes `process.env.X_CLIENT_ID` instead of using `clientInformation`. **Fix:** propagate `ClientInformation` in **`generateAuthUrl` AND `authenticate`** (and refresh, if applicable).
2. **Symptom:** IG comment activity returns 400/403 → **Cause:** wrong host/token for the integration type. **Fix:** always `resolveIgRoute(integration, ...)`. Never hardcode `graph.facebook.com`.
3. **Symptom:** IG webhook accepts events, but `is_user_follow_business` does not work → **Cause:** Facebook Login Page Access Token does not have Standard Access to that field. **Fix:** install `instagram.standalone.provider` (IG Login) or register an IG User Token under Settings > Credenciais > Instagram.
4. **Symptom:** Zernio returns "API key invalid" → **Cause:** `clientInformation.instanceUrl` (which carries the key) is not being read. **Fix:** check the `generateAuthUrl` flow of `ZernioBaseProvider` — the key resolves per-profile first, then org with `shareZernioWithProfiles`.
5. **Symptom:** Trying to import `late.*.provider` → **Cause:** Late was removed (rebranded to Zernio). **Fix:** use `zernio-<platform>.provider.ts`.
6. **Symptom:** Token refresh in an infinite loop → **Cause:** `RefreshToken` thrown even after a successful refresh. **Fix:** ensure the new token updates `Integration.token` and the original call is retried with the new token.

## Commands

```bash
# Spec for a specific provider
pnpm jest libraries/nestjs-libraries/src/integrations/social/x.provider.spec.ts
```

## References

- [`docs/architecture/instagram-automations.md`](../../../../../docs/architecture/instagram-automations.md) — Meta credentials, follow-gate, IG pitfalls (REQUIRED READING before changing IG)
- [`docs/architecture/credential-validation.md`](../../../../../docs/architecture/credential-validation.md) — credential validation
- [Zernio API docs](https://docs.zernio.com/llms-full.txt)
- [`src/chat/CLAUDE.md`](../../chat/CLAUDE.md) — IG webhook validation (HMAC with two secrets)
- [`apps/orchestrator/CLAUDE.md`](../../../../../apps/orchestrator/CLAUDE.md) — `FlowActivity.resolveIgRoute` wrapper
