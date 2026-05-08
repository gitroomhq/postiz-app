# Database Schema — High-Level Map

> **Canonical source:** [`libraries/nestjs-libraries/src/database/prisma/schema.prisma`](../../libraries/nestjs-libraries/src/database/prisma/schema.prisma).
> This document is a **navigation map**, not the source of truth. When in doubt, read the schema.

The repo has **63 Prisma models** total: ~55 domain models + 8 Mastra framework-internal models (prefixed `mastra_*`). Repositories live under `libraries/nestjs-libraries/src/database/prisma/<dir>/`. Some directories cover multiple related models; some models are accessed directly through framework code (Mastra, marketplace utilities) and have no dedicated repository.

## How to read this doc

Each row: **Model** → **Repository directory** → **Purpose** → **Where the rules live** (which `CLAUDE.md` documents the patterns around it).

When a model has rules documented in a child `CLAUDE.md`, that file is the *rule book*; this doc only points to it. When no child applies, the rules live in [`libraries/nestjs-libraries/CLAUDE.md`](../../libraries/nestjs-libraries/CLAUDE.md) (parent).

---

## 1. Identity & Multi-Tenancy

The tenancy backbone of the product. Org → Profiles → Members; users are mapped onto orgs via `UserOrganization`.

| Model | Repo dir | Purpose | Rules |
|---|---|---|---|
| `Organization` | `organizations/` | Workspace / tenant. Holds `lateApiKey`/`zernioApiKey`, `shareLateWithProfiles`/`shareZernioWithProfiles` flags. | Parent |
| `User` | `users/` | User account (email, password, super-admin flag, timezone). | Parent |
| `UserOrganization` | `users/` | User ↔ Organization join with `Role` enum (admin/user). | Parent |
| `Profile` | `profiles/` | Sub-account inside an Organization. `isDefault=true` profile mirrors org-level config; secondary profiles override per-tenant. Holds `aiImageCredits`/`aiVideoCredits`, `lateApiKey`/`zernioApiKey`, `shortlink`. | [`src/ai/CLAUDE.md`](../../libraries/nestjs-libraries/src/ai/CLAUDE.md) (overrides + AI credits), [`src/integrations/social/CLAUDE.md`](../../libraries/nestjs-libraries/src/integrations/social/CLAUDE.md) (Zernio key resolution) |
| `ProfileMember` | `profiles/` | Profile ↔ User membership (`ProfileRole` enum). | Parent |
| `OAuthApp` | `oauth/` | OAuth app configurations exposed by the workspace (used by external integrators). | Parent |
| `OAuthAuthorization` | `oauth/` | OAuth grants issued to those apps. | Parent |

## 2. Content & Composer

Everything the user schedules and publishes.

| Model | Repo dir | Purpose | Rules |
|---|---|---|---|
| `Post` | `posts/` | Scheduled / published post. Relates to `Integration`, `Profile`, `Organization`. | Parent + [`apps/orchestrator/CLAUDE.md`](../../apps/orchestrator/CLAUDE.md) (publishing pipeline) |
| `Mentions` | `posts/` | User mentions inside a post body. | Parent |
| `Tags` / `TagsPosts` | `posts/` | Tag and post↔tag join (`@@id([postId, tagId])`). | Parent |
| `Sets` | `sets/` | Named collections / templates of posts. Carries `profileId`. | Parent |
| `Signatures` | `signatures/` | User signatures appended to posts. | Parent |
| `Media` | `media/` | Media library entries (images/videos). | Parent |

## 3. Social Integrations

The 40+ social media providers all read/write through these tables.

| Model | Repo dir | Purpose | Rules |
|---|---|---|---|
| `Integration` | `integrations/` | A connected social account. `providerIdentifier` selects the provider (`instagram`, `instagram-standalone`, `zernio-tiktok`, etc.). `Integration.token` is either a Page Access Token OR an IG User Token depending on the identifier. | [`src/integrations/social/CLAUDE.md`](../../libraries/nestjs-libraries/src/integrations/social/CLAUDE.md) (40+ providers, OAuth, `resolveIgRoute`, three Meta credential layers) |
| `IntegrationsWebhooks` | `integrations/` | Webhook configuration per integration. | [`src/integrations/social/CLAUDE.md`](../../libraries/nestjs-libraries/src/integrations/social/CLAUDE.md) |
| `ProviderCredential` | `credentials/` | OAuth client credentials per workspace (`clientId/clientSecret`, `instagramAppId/instagramAppSecret`, `threadsAppId/threadsAppSecret`, `metaSystemUserToken`, `instagramTokens`). Encrypted with `ENCRYPTION_KEY`. | [`src/integrations/social/CLAUDE.md`](../../libraries/nestjs-libraries/src/integrations/social/CLAUDE.md) (App credentials layer, HMAC validation) |

## 4. AI Layer

| Model | Repo dir | Purpose | Rules |
|---|---|---|---|
| `AiProviderCredential` | `credentials/` | Per-`AiKind` (TEXT/IMAGE/VIDEO/WEB_SEARCH) provider config + encrypted API key. `AiScope` enum (PROFILE / WORKSPACE). | [`src/ai/CLAUDE.md`](../../libraries/nestjs-libraries/src/ai/CLAUDE.md) (resolution chain, `AiClientFactory`, 412 vs 402) |
| `Credits` | `subscriptions/` | AI image/video usage rows. `profileId` decrements per generation. | [`src/ai/CLAUDE.md`](../../libraries/nestjs-libraries/src/ai/CLAUDE.md) (credit precedence chain) |
| `ProfilePersona` | `profiles/` | Voice tone, target audience, CTAs, restrictions, image style. Injected into Mastra agent + caption() + DALL-E prompts. | [`src/ai/CLAUDE.md`](../../libraries/nestjs-libraries/src/ai/CLAUDE.md), [`src/chat/CLAUDE.md`](../../libraries/nestjs-libraries/src/chat/CLAUDE.md) |
| `ProfileKnowledgeDocument` | `knowledge/` | RAG document upload (PDF/TXT/MD). Pipeline: chunking → embeddings → pgvector. | [`src/chat/CLAUDE.md`](../../libraries/nestjs-libraries/src/chat/CLAUDE.md) (`knowledgeBaseQuery` tool) |

## 5. Automations / Instagram Flows

The Flow engine that powers follow-gate, comment auto-replies, and DMs.

| Model | Repo dir | Purpose | Rules |
|---|---|---|---|
| `Flow` | `flows/` | A user-defined automation. `FlowStatus` enum. | [`src/chat/CLAUDE.md`](../../libraries/nestjs-libraries/src/chat/CLAUDE.md), [`apps/orchestrator/CLAUDE.md`](../../apps/orchestrator/CLAUDE.md) |
| `FlowNode` / `FlowEdge` | `flows/` | Flow Builder graph (visual representation). `FlowNodeType` enum. **Wizard parity rule** — both wizard JSON and Flow Builder graph must stay in sync (same `triggerConfig`). | [`apps/orchestrator/CLAUDE.md`](../../apps/orchestrator/CLAUDE.md) (parity rule), [`src/chat/CLAUDE.md`](../../libraries/nestjs-libraries/src/chat/CLAUDE.md) |
| `FlowExecution` | `flows/` | Per-run instance of a flow. `FlowExecutionStatus` enum. | [`apps/orchestrator/CLAUDE.md`](../../apps/orchestrator/CLAUDE.md) |
| `PendingPostback` | `flows/` | Two-step follow-gate state (step 1 saves; step 2 resumes). `PendingPostbackStatus` enum. **`sendPrivateReply` is callable only ONCE per comment.** | [`apps/orchestrator/CLAUDE.md`](../../apps/orchestrator/CLAUDE.md), [`src/chat/CLAUDE.md`](../../libraries/nestjs-libraries/src/chat/CLAUDE.md) |
| `Webhooks` | `webhooks/` | Generic outbound webhooks (different from `IntegrationsWebhooks`). | Parent |

## 6. Repost Engine

| Model | Repo dir | Purpose | Rules |
|---|---|---|---|
| `RepostRule` | `repost/` | Definition of a repost rule (source → destinations). Carries the legacy `destinationIntegrationIds[]` (V1) and the relation to `RepostRuleDestination` (V2). | Parent |
| `RepostRuleDestination` | `repost/` | One row per (rule, integration, format) combination. `RepostDestinationFormat` enum. **Backfilled from V1 by `StartupMigrationService.backfillRepostDestinations`** if migrating from earlier deploys. | Parent + see migration pitfall in [`libraries/nestjs-libraries/CLAUDE.md`](../../libraries/nestjs-libraries/CLAUDE.md) |
| `RepostLog` | `repost/` | Execution log of repost events. `RepostLogStatus` enum, `RepostSourceType` enum. | Parent |

## 7. Lifecycle / Operational

| Model | Repo dir | Purpose | Rules |
|---|---|---|---|
| `AutoPost` | `autopost/` | Auto-generated post schedule per integration. | Parent |
| `Notifications` | `notifications/` | In-app notifications. | Parent |
| `Announcement` | `announcements/` | Banner announcements (`AnnouncementColor` enum). | Parent |
| `ReviewLink` | `review-links/` | Public review/feedback links. | Parent |
| `Errors` | (no dedicated dir) | Error log table. Usually written via Sentry pipeline, not domain code. | Parent |
| `ThirdParty` | `third-party/` | Generic third-party integration config (e.g., HeyGen, ImageSlides, Tavily — currently used as the boundary for non-social integrations). | Parent |

## 8. Marketplace (disabled by default — `DISABLE_MARKETPLACE=true`)

These tables exist but are dormant in self-hosted deployments. Tooling intentionally avoids touching them. Listed for completeness so a refactor doesn't accidentally remove them.

| Models | Notes |
|---|---|
| `Subscription` | Billing tier (`SubscriptionTier` enum, `Period` enum). Tied to `Organization`. Disabled when `DISABLE_BILLING=true`. |
| `Customer`, `Plugs`, `ItemUser`, `Star`, `Comments` (marketplace), `Mentions` | Plug/storefront entities. |
| `MessagesGroup`, `Messages` | In-app marketplace chat. |
| `Orders`, `OrderItems`, `PayoutProblems`, `UsedCodes` | Marketplace order pipeline (`OrderStatus`, `APPROVED_SUBMIT_FOR_ORDER` enums). |
| `Trending`, `TrendingLog`, `PopularPosts` | Marketplace trending analytics. |
| `GitHub` | GitHub-stars proof-of-work for plug ownership. |
| `ExisingPlugData` | Legacy plug data (typo preserved from upstream Postiz). |
| `SocialMediaAgency`, `SocialMediaAgencyNiche` | Agency directory. Repo dir: `agencies/`. |

If you are working in a marketplace-disabled deployment, you can ignore this entire group.

## 9. Mastra Framework Internal

These eight tables are managed by the [Mastra framework](https://mastra.ai/) directly — **do not query or migrate them through repositories**:

`mastra_ai_spans`, `mastra_evals`, `mastra_messages`, `mastra_resources`, `mastra_scorers`, `mastra_threads`, `mastra_traces`, `mastra_workflow_snapshot`.

The chat agent and tool runs persist their state through Mastra's own DAL. Touching them through Prisma risks corrupting agent memory. See [`src/chat/CLAUDE.md`](../../libraries/nestjs-libraries/src/chat/CLAUDE.md) for the agent layer.

---

## Migrations — Two Channels

The repo runs migrations through **two distinct mechanisms**, and choosing the right one matters:

### Channel A — Prisma migrations (DDL only)

`libraries/nestjs-libraries/src/database/prisma/migrations/` contains the standard Prisma migration files. Applied via `pnpm prisma-db-push`. Use this for: column adds/drops, index creation, unique constraints, enum extensions, FK changes — **anything expressible in pure DDL**.

### Channel B — `StartupMigrationService` (idempotent data migrations)

`libraries/nestjs-libraries/src/database/prisma/startup-migration.service.ts` is a `OnModuleInit` service that runs three migrations on **every backend startup**:

1. `migrateProfileScope()` — backfills `profileId` on `ProviderCredential`, `Webhooks`, `AutoPost`, `Sets` (default profile per org); copies `lateApiKey`/`shortlink` from `Organization` to default `Profile`. Phase 3 of the per-profile rollout.
2. `migrateLateToZernio()` — copies `lateApiKey` → `zernioApiKey`, copies `shareLateWithProfiles` → `shareZernioWithProfiles`, rewrites `Integration.providerIdentifier` from `late-X` to `zernio-X`.
3. `backfillRepostDestinations()` — populates `RepostRuleDestination` rows from the legacy `RepostRule.destinationIntegrationIds[]` array, inferring `RepostDestinationFormat` from `Integration.providerIdentifier`.

Key properties:

- **Idempotent.** Each method begins with a `count()` guard that skips when no rows need work. Re-running on every startup is the design.
- **Errors are swallowed.** Each migration wraps its work in `try/catch` and only logs failures. The app keeps starting. Tail the logs after deploy for `Late->Zernio migration failed:` etc.
- **Use this channel** when the migration needs application-level logic — joins, format conversion, conditional updates — that pure SQL would obscure. Pure DDL still goes through Channel A.

See pitfall #6 in [`libraries/nestjs-libraries/CLAUDE.md`](../../libraries/nestjs-libraries/CLAUDE.md) for the troubleshooting recipe.

## Enums (canonical list)

For quick reference. Source: `schema.prisma`.

| Enum | Used by |
|---|---|
| `AiKind` | `AiProviderCredential` (TEXT, IMAGE, VIDEO, WEB_SEARCH) |
| `AiScope` | `AiProviderCredential` (PROFILE, WORKSPACE) |
| `AnnouncementColor` | `Announcement` |
| `APPROVED_SUBMIT_FOR_ORDER` | Marketplace orders |
| `CommentKind` | `Comments` |
| `FlowExecutionStatus` / `FlowNodeType` / `FlowStatus` | Flow engine |
| `From` | `Messages` (marketplace) |
| `KnowledgeDocumentStatus` | `ProfileKnowledgeDocument` |
| `OrderStatus` | `Orders` |
| `PendingPostbackStatus` | `PendingPostback` |
| `Period` | `Subscription` (billing cycle) |
| `ProfileRole` | `ProfileMember` |
| `Provider` | `User` (auth provider: LOCAL, GOOGLE, etc.) |
| `RepostDestinationFormat` / `RepostLogStatus` / `RepostSourceType` | Repost engine |
| `Role` | `UserOrganization` (org role) |
| `ShortLinkPreference` | `Organization`, `Profile` |
| `State` | Generic state |
| `SubscriptionTier` | `Subscription` |

## When this map is not enough

This is a high-level navigator. For the actual rules, conventions, and pitfalls of any subdomain, follow the link in the rightmost column to the appropriate `CLAUDE.md`. Open `schema.prisma` directly for FK details, `@@index` declarations, and exact field types.

If you find yourself navigating between three or more tables and this map plus the children CLAUDE.md still leave gaps, that is the trigger to consider promoting `database/prisma/` to its own `CLAUDE.md`. See "Conscious Deferrals" in [`docs/planning/claude-md-maintainer-agent.md`](../planning/claude-md-maintainer-agent.md).
