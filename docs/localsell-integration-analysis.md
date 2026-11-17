# Localsell integration analysis

## Scope and decision

Localsell must be an integration layer inside the existing Postiz deployment, not a second scheduler, publisher, upload service, or user database.  A Localsell business is mapped to one Postiz `Organization`; a Localsell store is a scoped child context within that organization.  Postiz continues to own drafts, scheduled posts, media, channel connections, publishing state, and queue execution.

The work is intentionally phased.  This document is the implementation baseline for Phases 2–7; no Localsell production traffic should be enabled until the SSO trust contract, tenant mapping, and webhook secret handling have been reviewed.

## Existing architecture discovered

| Area | Existing implementation | Reuse for Localsell |
| --- | --- | --- |
| Backend | NestJS in `apps/backend`; authenticated controllers are wired through `ApiModule` and `AuthMiddleware`. | Add narrow Localsell controllers/services to this module, protected by the existing middleware plus store-context authorization. |
| Frontend | Next.js in `apps/frontend`, with authenticated `(app)/(site)` routes and reusable composer/media components. | Add a marketing entry point and AI composer route here; keep standard Postiz post editing, preview, scheduling, and publishing. |
| Database | Prisma schema at `libraries/nestjs-libraries/src/database/prisma/schema.prisma`; repository/service pattern. | Add mapping, cache, AI-generation, conversation, usage, and WhatsApp state models by migrations only. |
| Tenant model | `Organization`, `User`, and `UserOrganization` already provide organization membership and `Role`. | Every Localsell record is keyed by organization plus business/store external identifiers; membership is verified server-side. |
| Authentication | `AuthMiddleware` validates a signed Postiz JWT then reloads the user and selected organization. Native OAuth app authorization/token exchange exists in `api/routes/oauth.controller.ts`. | Prefer a dedicated signed, short-lived Localsell assertion exchange; create a Postiz session only after server-side verification and mapping. Do not share passwords. |
| Channel providers | `IntegrationManager` registers provider classes under `libraries/nestjs-libraries/src/integrations/social`; `Integration` records are organization-scoped. | Implement WhatsApp as a provider plus a message delivery service, not as Localsell-specific HTTP calls. |
| Publishing | Temporal workflows in `apps/orchestrator`; `PostActivity.postSocial` resolves the provider then updates Postiz post state. | Campaigns create normal Postiz drafts and invoke the existing scheduling/publishing path only after confirmation. |
| Media | `UploadFactory` supports `local` and Cloudflare-backed storage; `Media` is organization-scoped. | Import/cache approved Localsell product images through the existing validated uploader and save only useful snapshots/references. |
| AI | `OpenaiService` and `FalService` are injectable services in `DatabaseModule`. | Introduce an interface-backed OpenRouter provider and call it through a content/intent service, never from a browser component. |
| Rate limiting | Global Nest throttling uses Redis. | Add tighter, named limits and monthly usage checks to SSO, AI, and WhatsApp endpoints. |

## Current constraints and implications

1. The generic `Integration.token` field is currently persisted as a string.  A WhatsApp OAuth/token implementation must introduce encrypted-at-rest credential storage before persisting a long-lived token; raw tokens must not be returned by any controller or written to logs.
2. Existing Postiz roles are organization-wide.  Store-level permissions need an explicit mapping table and guard; client-side store selection is never sufficient.
3. Existing OpenAI calls are configured at module load time.  OpenRouter needs its own lazy, environment-configured client so an absent key produces a clear disabled-provider error rather than a dummy request.
4. Existing post workflows are suitable for social publishing but are not an outbound transactional-message queue.  WhatsApp retries need an idempotency key and durable delivery state before a Temporal activity is added.
5. Product data is owned by Localsell.  Postiz must cache a minimal, expiring product snapshot tied to an external ID instead of copying catalogs.
6. WhatsApp Status and WhatsApp Channel are not treated as direct publishing channels. They require export/reminder/manual confirmation until an official Meta API is verified for those destinations.

## Proposed module boundaries

```
Localsell UI/session
  -> signed SSO assertion / server-to-server product API
  -> LocalsellIntegrationService
       -> LocalsellTenantGuard -> Organization + Store context
       -> ProductContextService -> minimal local cache
       -> AiContentService -> OpenRouterProvider
       -> PostsService / MediaService / Temporal (existing)
       -> WhatsAppProvider + WhatsAppDeliveryService (provider-neutral)
```

`LocalsellIntegrationService` owns only identity mapping and verified external API access.  `ProductContextService` owns reference/cache freshness.  `AiContentService` owns validated structured output, cost metering, and generation records.  `WhatsAppProvider` owns Meta API protocol; `WhatsAppDeliveryService` owns message lifecycle and idempotent retry.  No provider contains campaign or Localsell-specific rules.

## Planned data changes

All proposed tables contain `organizationId`; child records additionally contain a Localsell business/store key.  Names are intentionally integration-oriented:

| Model | Purpose | Key constraints |
| --- | --- | --- |
| `LocalsellTenant` | Maps a Postiz organization to a Localsell business. | unique `organizationId`; unique external business ID. |
| `LocalsellStore` | Store context owned by a mapped tenant. | unique `(tenantId, externalStoreId)`; active flag. |
| `LocalsellUserMapping` | Maps Localsell subject to Postiz user and permitted tenant/store scope. | unique external subject + tenant; no Localsell password. |
| `LocalsellProductCache` | Minimal product snapshot/reference used in generation. | unique store/product external pair; expiration/version metadata. |
| `AiGeneration` | Validated AI request/result metadata. | org/store/user ownership; provider/model/request type/status. |
| `AiUsageEvent` | Metering record. | org/store/user + provider/model + token/media counts; indexed by time. |
| `AiConversation` / `AiConversationMessage` | Assistant history and structured intent. | tenant-scoped; user-scoped access. |
| `WhatsAppConnection` | WABA/phone references and encrypted credential reference. | org/store scoped; no plaintext secret response. |
| `WhatsAppMessage` | Outbound message payload fingerprint, Meta ID, status and retry metadata. | unique idempotency key; Meta ID index. |

`Post`, `Media`, and `Integration` remain the system of record for existing Postiz functionality.  Phase 2 adds migrations; it must not alter historical migrations or duplicate those records.

## Security design

- Validate Localsell JWT issuer, audience, expiry, signature, nonce/jti and clock skew using a dedicated integration secret or asymmetric public key.  Accept only short-lived assertions; record/reject replayed `jti` values.
- Resolve the Localsell subject, business, store and Postiz organization server-side on every request.  Query filters always include organization and allowed store IDs.
- Store OAuth/WhatsApp credentials encrypted with a versioned envelope key supplied only by server environment.  Redact `Authorization`, tokens, secrets, and signed assertion bodies in logs/errors.
- Verify WhatsApp `hub.verify_token` and `X-Hub-Signature-256` against the raw request body before parsing business events.  Persist webhook event IDs to deduplicate delivery notifications.
- Restrict product image import to validated HTTPS URLs, supported MIME types and maximum byte sizes.  Retain existing SSRF protection; never disable it for untrusted Localsell URLs.
- Use DTO validation, allowlisted platform/language/tone values, prompt length limits, rate limits, usage quotas, and output-schema validation.  Treat all AI output as untrusted display content.
- Require an explicit preview/save/schedule/publish confirmation.  Voice and chat intent extraction never publishes or sends WhatsApp messages by itself.
- Use per-message idempotency keys and retry only categorized transient WhatsApp failures.  Never retry a known accepted Meta message ID.

## Implementation sequence

1. **Foundation:** migration, tenant/store/user mappings, Localsell assertion verifier, authorization guard, product API client/cache, integration documentation and tests.
2. **OpenRouter:** client abstraction, schema-validated generation/intent, usage metering, internal error redaction and limits.
3. **Composer:** product picker, chat/intent API, bilingual preview, create/edit a normal Postiz draft; no automatic publish.
4. **Voice:** browser microphone adapter first, pluggable transcription provider contract, confirmation-gated command execution.
5. **WhatsApp:** encrypted connection flow, verified webhook controller, provider protocol, durable delivery/retry activity, templates and media.
6. **Campaign workflow:** connect selected products and generated assets to existing post groups, media and Temporal schedule; show channel-specific status.

## Meta capability decision

The Cloud API supports business-to-customer messages, approved templates and media through a Phone Number ID. Status and Channel content must remain manual-export destinations in this implementation: there is no supported direct publishing capability wired into Postiz. This is a deliberate provider boundary, not a temporary fake publish result.

Each phase requires Prisma generation/migration, DTO/controller/service tests, organization-isolation tests, and an upgrade review before the next phase.

## Files expected to change

- `libraries/nestjs-libraries/src/database/prisma/schema.prisma` and a new migration.
- New Localsell, AI and WhatsApp services/repositories under `libraries/nestjs-libraries/src`.
- `libraries/nestjs-libraries/src/database/prisma/database.module.ts` for providers.
- New authenticated/public webhook controllers under `apps/backend/src/api/routes`, registered in `apps/backend/src/api/api.module.ts` with raw-body handling where required.
- `apps/orchestrator/src/activities` and workflow registration only after durable WhatsApp delivery models exist.
- New authenticated Next.js routes/components under `apps/frontend/src/app/(app)/(site)` and `apps/frontend/src/components`.
- `.env.example`, Docker configuration only for documented server-only variables.
