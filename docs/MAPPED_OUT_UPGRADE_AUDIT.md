# Mapped Out Social Studio — Upgrade Audit (Phase 0)

> **Status:** Phase 0 deliverable — read-only audit + design. No application code was changed to produce this document.
> **Date:** 2026-07-25 · **Author:** Claude (Opus 4.8), acting as CTO/architect for the Mapped Out upgrade.
> **Method:** four parallel read-only code-audit agents over a fresh read-only clone of `itsmohaji/postiz-app@mappedout-branding`, plus the DBU integration contract from `itsmohaji/dbu-group-system/docs/integration/*`, plus first-hand reads of the infra repo `itsmohaji/postiz-production` (`~/Desktop/Postiz`).
> **Scope note:** the product's user-facing name is **Mapped Out Social Studio**. The upstream open-source product name must never appear in any user-facing surface, DB label, API response, or notification.

---

## 0. Repository topology — the single most important fact

The upgrade spans **three** repositories; only the infra one is the working directory.

| Concern | Repo | Local | Role in this upgrade |
|---|---|---|---|
| **Application code** (UI, backend, workers, schema, IG publishing, DBU sync) | `itsmohaji/postiz-app` branch **`mappedout-branding`** | *not checked out* (cloned read-only for this audit) | **~99% of all upgrade work happens here** |
| Stack / Temporal / env / networking | `itsmohaji/postiz-production` = `~/Desktop/Postiz` | ✅ open | Only compose/env/Temporal changes |
| DBU integration contract | `itsmohaji/dbu-group-system` → `docs/integration/*` | ✅ read via `gh` | Reference-only; DBU side owned separately |

**Consequence:** a permanent working checkout of `itsmohaji/postiz-app` must be established before Phase 1. The app is a *prebuilt image* — there is no app source in `~/Desktop/Postiz`.

---

## 1. Current architecture

**Monorepo:** Nx + pnpm workspaces (pnpm 10.6.1). Node engines `>=22.12 <23` (Volta pins 20.17.0 — a mismatch to fix).

| Layer | Tech | Version |
|---|---|---|
| Backend API | NestJS | 11.1.21 |
| Frontend | Next.js (App Router) / React | 16.2.6 / 19.2.4 |
| ORM | Prisma (Postgres) | 6.5.0 |
| Workflow/queue engine | **Temporal** (`@temporalio/*` 1.14, `nestjs-temporal-core` 3.2) | — |
| Cache / rate-limit / pub-sub | Redis via `ioredis` (`MockRedis` fallback) | — |
| AuthZ primitive | `@casl/ability` (subscription-tier gating) | 6.5 |
| Billing | Stripe | 20.4 |
| Frontend UI | Tailwind 3.4 (`darkMode:'class'`) + Mantine 5.10 + SWR + Zustand | — |

**Apps:** `backend` (Nest API), `frontend` (Next, port 4200), `orchestrator` (Temporal worker — this is where publishing executes), `commands` (Nest-command CLI for one-off ops), `extension`, `sdk`. Shared: `libraries/nestjs-libraries`, `libraries/helpers`.

**There is no BullMQ.** All async/scheduled work is Temporal (task queue `main` + dynamic per-integration queues). Redis is cache/rate-limit/pub-sub only. This corrects the top-level infra CLAUDE.md, which implied BullMQ/cron; the real engine is Temporal, and the frontend is Next.js (not "Vite React" as the DBU doc states).

**Tenancy model (multi-tenant boundary objects):**
- `Organization` — tenant root; nearly every model FKs `organizationId`/`orgId`.
- `User` — global; `isSuperAdmin` boolean god-flag.
- `UserOrganization` — the membership+role join (`userId`,`organizationId`,`role`,`disabled`,`canConnectChannels`). **This is the tenant boundary object.**
- `UserAssignment` (fork-added) — grants a member ONE `integrationId` or ONE `customerId`; FK to `UserOrganization` (cascade). **This is the per-client/per-channel sub-scope layer** and the foundation to extend for the 3-role model.
- `Customer` — a client within an org (fork-added `dbuClientId`/`dbuClientName`).
- `Integration` — a social account (`providerIdentifier`, encrypted `token`/`refreshToken`, `customerId?`, `disabled`, `refreshNeeded`, fork-added `dbuClientId`).
- `Post` — execution record (`state`, `approvalStatus`, `publishDate`, `content`, `group`, `releaseId`, `error`, fork-added DBU linkage columns).

**Deploy topology (Coolify VPS `187.127.100.103`):** push `mappedout-branding` → GH Actions `mappedout-build.yml` builds `Dockerfile.dev` → GHCR `:mappedout` → Coolify app `pu53f10y6ml47hc3t88mdrs7` redeploy → `social.mappedout.co`. Container entrypoint `nginx && pnpm run pm2` runs `prisma db push --accept-data-loss` on **every boot**. **No migration files exist.** Pushing any other branch (e.g. `phase2`) builds a `:<branch>` tag — this is the staging lever.

---

## 2. Existing working features (preserve)

- **Publishing engine (Temporal):** durable scheduling, terminate-existing-on-reschedule, per-integration queues, token-refresh workflow, missed-post catch-up, retries with backoff, webhooks/plugs fan-out, repeatable posts. Solid; **do not rebuild.**
- **Multi-network social publishing** for all upstream providers (X, LinkedIn, Facebook, IG, TikTok, YouTube, Threads, Pinterest, Reddit, etc.) — working provider layer.
- **Org-level tenancy** — every service method takes `orgId`; repositories filter on it. The **org boundary holds**.
- **Fork-added RBAC foundation (KEEP + EXTEND):** `RolesGuard` (`@OrgRoles`, `@ClientAllowed`), `UserAssignment` sub-scope, `IntegrationService.getScope()`/`filterAssignmentsToScope()` (re-clamps a manager so they can't grant beyond their own scope).
- **DBU integration scaffolding (KEEP + HARDEN):** inbound `/dbu/v1/*` HMAC controller (health/approval/comment) with **correct** timing-safe HMAC verification; outbound emitter (`content.upsert`/`content.status`); org-scoped `/dbu-options/*` proxy; composer **DBU association panel** (Client→Project→Cycle cascading selector, stable-ID keyed).
- **Auth middleware** re-resolves the user from DB by id (never trusts token claims) and checks `activated`.
- **Branding already applied:** "Mapped Out Social" logo/name; channel allowlist; AI/Agents removed from nav.

---

## 3. Broken / incomplete features

| # | Area | Severity | Summary |
|---|---|---|---|
| B1 | **Instagram publishing** | **Critical (live)** | "Connected" but posts never publish. Root cause identified — §6. |
| B2 | **Per-client authorization (IDOR)** | **High (release-blocking)** | By-id post routes scope by org only, not by assignment — §9 / Authorization Defect Inventory. Latent today (no scoped users yet) but blocks inviting Account Managers. |
| B3 | **DBU outbound sync durability** | **High** | Every MO→DBU emit is fire-and-forget with the failure swallowed; publish/error status can be silently lost forever — §8. |
| B4 | **Zero automated tests** | **High** | 0 spec files. No regression net for any of the above. |
| B5 | **JWT: no expiry, unpinned algorithm** | Medium | Leaked token valid forever (`helpers/src/auth/auth.service.ts`). |
| B6 | **`prisma db push --accept-data-loss` on every boot** | Medium | No migrations/rollback; additive-only discipline mandatory. |
| B7 | **Two design-token systems + two layout trees** | Medium | `--color-*` legacy vs `--new-*`; `components/layout/*` vs `new-layout/*`. |
| B8 | **DBU mapping tables not applied to prod (DBU side)** | Medium | DBU journal notes `social_channel_map`/`social_content_links`/`social_sync_log` migrations were not applied on the live Supabase stack — verify before E2E. |

---

## 4. Current UI weaknesses (redesign target)

- Structurally **stock Postiz with branding swapped + features gated** — not yet a bespoke product.
- **Two coexisting token systems** (`app/colors.scss` `--color-*` legacy + `--new-*`) and **two layout trees** — inconsistent, hard to theme cleanly.
- **Mixed typography** (Plus Jakarta Sans shell vs Helvetica Neue Tailwind default vs Arial) — no coherent type scale.
- **Icons are inline hand-coded SVGs** in `top.menu.tsx` — no managed icon set.
- **Brittle, UI-only gating:** channel allowlist is a hard-coded array inside a 785-line provider component (`launches/add.provider.component.tsx:686`); AI removal is just an omitted menu entry (route + CopilotKit still live). No centralized feature-flag layer.
- **Dense consumer chrome** (80px rails, streak/gamification, announcement banners) — reads as a consumer tool, not premium B2B.
- Single purple/pink accent pair (`#612bd3` / `#d82d7e`), Tailwind-default spacing/elevation — no design system.
- `darkMode:'class'` on `document.body` via cookie+EventEmitter — SSR-flash risk in App Router.

**Redesign anchor files:** shell `new-layout/layout.component.tsx` + `layout/top.menu.tsx`; tokens `app/colors.scss` + `tailwind.config.cjs`; branding `new-layout/logo.tsx` + `ui/logo-text.component.tsx`; composer `new-launch/manage.modal.tsx` + `dbu.association.panel.tsx`.

---

## 5. Current publishing architecture (Temporal)

1. `POST /posts` → `PostsService.createPost(orgId,…)` persists the `Post` group `state=QUEUE` + `publishDate`.
2. `startWorkflow(taskQueue, postId, orgId, state)` — **terminates any running workflow for that postId**, then (unless DRAFT) starts `postWorkflowV105`, `workflowId=post_{postId}`, `TERMINATE_EXISTING`, search attrs `postId`+`organizationId`.
3. Workflow loads the post, verifies `state===QUEUE`, `sleep()`s until `publishDate` (durable timer).
4. **Pre-flight:** bails early if integration `refreshNeeded` or `disabled` (see §6 — this early-return is the IG bug).
5. **Publish:** dynamic per-integration queue → activity `postSocial(integration,[post])` → `provider.post(internalId, token, media, integration)`; head post then delayed comments; on `refresh_token` failure → `refreshTokenWithCause` + retry (5 inner + Temporal 3× / 2-min policy).
6. **Persist:** `updatePost(id, providerPostId, releaseURL)` → `state=PUBLISHED` + success notification.
7. Fan-out: webhooks, internal/global plugs, repeatable posts.
8. Repeat: child workflow (`ABANDON`) if `intervalInDays`.

Cron-equivalents are Temporal scheduled workflows in the orchestrator (`refresh.token`, `missing.post`, `streak`, `digest.email`, `autopost`), not `@nestjs/schedule`.

---

## 6. Instagram publishing architecture + exact suspected cause

**Two IG providers registered** (`integration.manager.ts:45-46`), chosen per account by `Integration.providerIdentifier`:
- `instagram` (via Facebook) — `graph.facebook.com`; token `pageAccessToken___userAccessToken`; **`refreshToken()` is a no-op stub** (`instagram.provider.ts:87-97`).
- `instagram-standalone` — `graph.instagram.com`; IG-login OAuth; `refreshCron=true`; long-lived (~58–60 day) token refreshed via `refresh_access_token`; its `post()` delegates to the Facebook provider with `type='graph.instagram.com'`.

Queue routing (`providerIdentifier.split('-')[0]='instagram'` for both) is **correct — not the bug**.

### Exact suspected cause (ranked)

**#1 — `refreshNeeded=true` silently blocks all publishing while the tile still shows "Connected."** This is the strongest match for the exact symptom.
- On any token-refresh failure, `refreshProcess` sets `refreshNeeded` and calls `disconnectChannel`, which sets **only `refreshNeeded:true`, never `disabled`** (`integration.repository.ts:241-251,398-408`) — so the account still renders as connected.
- The publish workflow does `if (post.integration?.refreshNeeded) { inAppNotification(info); return; }` **without calling `changeState`** (`post.workflow.v1.0.1.ts:99-109`) → the post stays `QUEUE`, no `ERROR`, no `errors` row. **"Connected + not published + no visible error"** = exactly this path.

**#2 (the cause behind #1 for Facebook-connected IG):** `InstagramProvider.refreshToken` is a no-op stub, so `refreshProcess` always sees an empty token → permanently trips #1 with no recovery. Meta conditions mapped to `refresh-token` (REVOKED_ACCESS_TOKEN, subcode 33, session invalidated, HTTP 401, body containing `190,`) each trigger this.

**#3 — Standalone token expiry / refresh cron not effective** (most relevant to **Epoque**, whose channel is `instagram-standalone`): if the `refresh_<id>` workflow isn't running or the token lapsed (>60 days / app in dev mode / app removed), refresh fails → same `refreshNeeded` trap.

**#4–#8 (produce a *visible* `ERROR`, so they don't match the silent symptom but must be ruled out):** media URL not publicly reachable by Meta (local storage + non-public `FRONTEND_URL`); container status poll exits early / token mismatch on the poll (`userToken||accessToken` vs `accessToken`); stale IG↔Page mapping; publish permission revoked after connect; worker/queue not running or `EXCLUDE_QUEUE` includes `instagram`.

**Because Epoque = `instagram-standalone`, the primary hypotheses are #1 + #3.**

### Diagnosis plan (the definitive test — read §"Instagram diagnosis plan" below)
Out-of-band (no code change): read `Integration.refreshNeeded`/`disabled` for the Epoque channel; read `Post.state` + the `errors` table; in Temporal UI check whether `post_<id>` ran and whether queue `instagram` has active pollers + whether `refresh_<id>` workflows run + token age.
- `state=QUEUE` + no `errors` row ⇒ #1/#3 (check `refreshNeeded`) or #5 (check pollers).
- `state=ERROR` ⇒ read `errors.body` (raw Meta JSON) → pinpoints #4/#6/#7/#8.

**Instrumentation to add (Phase 3 / IG emergency sub-phase):** log full JSON of container-create, each status poll (incl. terminal ERROR/EXPIRED + container id), and `media_publish`; log the actual media URL sent to Meta; thread `postId`/`workflowId` correlation id into `provider.post`; **and fix the swallow** — `refreshNeeded`/`disabled` early-returns must set a *visible* state and a clear "Reconnect required" account-health status, and Facebook `refreshToken` must stop being a silent no-op.

**Definition of done (yours):** a real test post publishes to Instagram, Mapped Out stores the IG post id (`releaseId`), and status becomes `PUBLISHED` — verified on a safe test account, not merely "Connected."

---

## 7. DBU integration architecture

Server-to-server only; no secret ever reaches the browser. Contract: `dbu-group-system/docs/integration/ARCHITECTURE_AND_MAPPING.md`.

- **Inbound** `/dbu/v1/*` (externally `/api/dbu/v1/*`): `health`, `approval` (`APPROVED|NEEDS_CHANGES|REJECTED` → `setApprovalStatus`), `comment` (mirror into `Post.dbuDiscussion`). HMAC via `DbuAuthMiddleware`: `HMAC-SHA256(secret, ts.canonical(body))`, header `X-MO-Signature`+`X-MO-Timestamp`, ±5-min window, **timing-safe compare** — **verification is correct and matches the contract**.
- **Outbound** emitter `dbu.emit.ts`: `content.upsert` on create/update, `content.status` on publish/state-change; signs identically; guards on url+secret+`dbu.clientId`.
- **ID model:** stable IDs throughout (`post.id`, `dbuClientId/ProjectId/MilestoneId`, `channelId=integrationId`); **names never used as keys**; DBU association stamped from the composer selection, never inferred from the channel.
- **Data-leak check: CLEAN** — outbound payload carries only post/channel/media-path/status/DBU-ids; no staff notes, assignments, other clients, or the `settings` blob. Internal DBU notes never touched.

*(DBU is source-of-truth for clients/projects/approval; Mapped Out owns channels/content/scheduling/publishing; the external DBU **Portal** at `portal.dbugroup.net` is a separate system and is NOT rebuilt.)*

---

## 8. Synchronization problems (MO ⇄ DBU)

**Headline defect — outbound durability (High):** every emit is fire-and-forget with failure swallowed (`posts.service.ts:957-965` `.catch(()=>{})`; `posts.repository.ts:477,588` `emitDbuStatus(id).catch(()=>{})`; emitter wrapped in try/`best-effort`). If DBU is unreachable at publish time (down/DNS/TLS/timeout), the `published`/`error` status is **silently lost** — no Postiz-side outbox, retry, or dead-letter — and DBU is stuck showing `scheduled`/`publishing` forever. The contract's `social_sync_log` retry/dead-letter is a **DBU-side** primitive that only helps if the request *arrives*; a transport failure never produces a `social_sync_log` row.

Secondary gaps vs the contract:
- **No inbound replay-nonce** — a captured signed request is replayable for 5 min (window-only).
- **No target-ownership check** on inbound `approval`/`comment` — updates *any* `postId`; no check that `Post.dbuClientId` matches the approving client (cross-post clobber within the trust boundary).
- **No `version` / optimistic-concurrency** — out-of-order approval webhooks silently overwrite a newer decision (`version` column in the contract is never read/written).
- **`dbuContentItemId` missing `@unique`** (contract §4.4 requires it) → double-link possible on retry.
- **`setApprovalStatus` does not emit** outbound and writes no `PostApproval` audit row; the contract's admin-`OVERRIDE_*` audit flow is absent.
- **Comment endpoint has no dedupe** (`external_id`); replays duplicate the thread.
- Minor provider-value inconsistency between create (`settings.__type`) and status (`providerIdentifier`).

**Fix posture (per your directive #8):** strengthen sync/retries/logging/monitoring/compatibility only. Add a durable outbound outbox + retry/dead-letter; inbound nonce + target-ownership + `version`; `@unique`; emit-on-approval; `OVERRIDE_*` audit. **No business-logic change; DBU side untouched.**

---

## 9. Security risks

- **S1 — Per-client IDOR (release-blocking).** See the Authorization Defect Inventory below. By-id post routes scope by org only; a scoped `ACCOUNT_MANAGER` could reach another client's post by id. **Latent today** (production org has only SUPERADMIN/ADMIN/CLIENT users — no scoped managers exist yet), so it becomes exploitable exactly when Phase 2 introduces the invitation/assignment flow. Close it **before** inviting any scoped user.
- **S2 — JWT no expiry + unpinned algorithm** (`helpers/src/auth/auth.service.ts`): pin `HS256`, add `expiresIn` + refresh, before elevated roles ship.
- **S3 — DBU HMAC endpoints run with no `req.org`/`req.user`** (global guards intentionally pass them). Safety rests entirely on HMAC + body-supplied ids → any DBU handler that trusts a body `orgId`/`clientId` is a cross-tenant vector unless it binds org/target server-side (ties to §8 target-ownership).
- **S4 — Media URLs public/unsigned** (`/uploads/YYYY/MM/DD/<32-hex>`) — known; mitigated for client display by the DBU media proxy; do not widen exposure.
- **S5 — `.claude/settings.local.json` (infra repo) contains a hard-coded live Coolify API token** and VPS-root SSH command history. `.claude/` is now gitignored, but the **token should be rotated** (it also appears in shell history). Owner action.
- **S6 — RolesGuard reads `org.users[0].role` positionally** — fragile if the membership query ever returns >1 row; harden during Phase 2.

---

## 10. Data-isolation risks

- **Org boundary: holds** (every repository query carries `orgId`).
- **Per-client (sub-org) boundary: does NOT hold on by-id routes** — the central risk for the 3-role model, because `ACCOUNT_MANAGER` is defined by per-client/per-account assignment. Enforcement (`getScope`) is applied on list/calendar + the client portal but not on by-id read/mutate. Must become a **centralized object-level authorization** check (your directive #4), not per-controller patches.
- **CLIENT default-deny** is the only thing between a client user and every un-annotated controller — robust because guards are global, but `public-api` and `dbu-integration` run their own middleware stacks and don't inherit `RolesGuard`.

---

## 11. Performance risks

- Calendar/list endpoints already apply scope; large orgs will need pagination + indexes as clients/posts grow.
- No BullMQ — Temporal handles backpressure; the risk is orchestrator worker capacity + `EXCLUDE_QUEUE` misconfiguration silently stranding a provider's queue.
- `prisma db push` schema drift can surprise query planners; add indexes deliberately with each additive change.
- Media served locally from the container volume — fine now; move to R2/CDN before scale (already env-supported).

---

## 12. Proposed architecture (extend, don't replace)

- **Authorization (your directive #1/#2):** keep `RolesGuard` + `@OrgRoles` + `@ClientAllowed` + `UserAssignment`. Add **one centralized object-level authorization utility** (a guard/service, e.g. `assertCanAccess(user, org, {resource, id, action})`) resolving org → assignment scope (`getScope`) → resource ownership → action permission, applied uniformly to every by-id and bulk route. No second authz system.
- **Role model (your directive #2 — 3 roles):** `SUPER_ADMIN` (global owner), `AGENCY_ADMIN` (agency operations; cannot transfer ownership / remove super admin / change protected DBU settings / read secrets), `ACCOUNT_MANAGER` (the only operational role; **strictly** assigned clients + accounts; job titles like Designer/Copywriter/Analyst are labels, not roles). Map existing enum: `SUPERADMIN→SUPER_ADMIN`, `ADMIN→AGENCY_ADMIN` (confirm which admins should be `SUPER_ADMIN`), `USER→ACCOUNT_MANAGER`. **`CLIENT` is orthogonal — see §"CLIENT role analysis"; do not fold it into the staff model.**
- **Design system:** one token set (retire `--color-*`), one shell (`new-layout/*`), a managed icon set, a coherent type scale, premium light/dark — Phase 1, no data-access changes.
- **DBU sync:** durable outbox + retry/dead-letter + nonce + target-ownership + `version` — hardening only.
- **Instagram:** fix the silent `refreshNeeded` trap + real Facebook `refreshToken` + account-health surfacing + publish instrumentation.

---

## 13. Migration strategy

- **Schema:** additive/nullable only (`prisma db push --accept-data-loss`). **Never drop an in-use enum value** (would lose `CLIENT`/existing rows). Add new `Role` enum values, backfill `UserOrganization.role` in a data step, keep old values until fully migrated + verified. Verify live-DB parity (`prisma db pull` diff) before every deploy.
- **Roles:** introduce new enum values alongside old; migrate memberships in a reversible data script; keep `@OrgRoles` semantics; add tests before flipping any default.
- **Everything staged first** (directive #7): local → `phase2`/staging branch → staging image → staging URL → your approval → production.

---

## 14. Rollback strategy

| Change type | Rollback |
|---|---|
| App image | Coolify redeploy the previous `:mappedout` (or prior) tag; `Post`/schema additions are nullable, safe to leave |
| Schema (additive) | Additive columns are inert; a bad data-migration reverses via its documented DOWN script (author one per migration) |
| Staging | `phase2` branch is disposable; never overwrites `:mappedout` |
| DBU integration | DBU side has its own phaseN + backup (`phase49`); Postiz outbound changes are additive |
| Infra (`postiz-production`) | `git revert` + push (Coolify redeploys); Temporal state persists on named volumes |

---

## 15. Testing plan

Current coverage: **0 spec files.** Phase 2 must ship a minimum **authorization** suite before broader features (your directive #5). Required tests (extend to every fixed route):
- `ACCOUNT_MANAGER` assigned Client A **can** list/read Client A posts, media, campaigns, reports.
- **cannot** read / update / delete Client B post/media/campaign/report by id.
- URL/param manipulation blocked; direct API manipulation blocked; bulk actions scoped; search never leaks; exports never leak; background jobs respect authorization.
- `SUPER_ADMIN` global access preserved; `AGENCY_ADMIN` respects configured scope; disabled/removed assignment **immediately** revokes access.
- Regression test per fixed route. Later phases add: publishing integration tests (IG happy-path + failure recovery), DBU contract tests (inbound HMAC/replay/idempotency; outbound durability/retry), component + E2E (the Epoque round-trip), browser QA.

---

## 16. Authorization Defect Inventory (release-blocking — directive #2/#4)

**Confirmed (agent-verified):** `posts.controller.ts` by-id routes pass only `org`, not `scope`: `GET /:id` (:174), `GET /:id/statistics` (:44), `GET /:id/missing` (:52), `PUT /:id/release-id`, `POST /:id/comments`, `PUT /:id/date`, `DELETE /:group` (:60,:74,:266). `getPostById` filters by `orgId` alone. Calendar/list (`GET /posts`) and the whole client portal **do** apply `getScope`.

**Required full object-level audit (Phase 2 — do not patch only the three obvious handlers):** posts · drafts · scheduled posts · media · campaigns · tasks · comments · approvals · reports · analytics · exports · social accounts · publication jobs · background-job actions · duplicate/clone routes · bulk actions · file downloads. Every request validates: **organization ownership · assigned client scope · channel/account scope · campaign scope (where applicable) · action permission · active assignment.** Never authorize by org alone when the user is client-scoped. Implement as **one centralized mechanism**, not per-controller checks. Demonstrate the cross-client attack on staging **before** the fix (where safely reproducible) and **blocked** after, with regression tests, then stop for approval.

---

## 17. CLIENT role analysis (directive #3)

- **What it is:** a **fork-added** role powering an **in-Postiz client-review portal** (`ClientPortal` component + `client.controller.ts` = "read + approve + comment surface for Clients").
- **Where used:** `roles.guard.ts` (default-deny gate; `@ClientAllowed` opens routes); `client.controller.ts` (`posts`, `getComments`, `addComment`, `getApprovals`, `setApproval`); `users.controller.ts` (self/personal/email-notifications/orgs/track); `new-layout/layout.component.tsx:75` (`role==='CLIENT' && !admin` → renders `<ClientPortal/>`); `settings/teams.component.tsx` (display). One live CLIENT user exists (`itsmohaji@gmail.com` in the Epoque org, per EPOQUE_MAPPING).
- **Does the DBU Portal depend on it? NO.** The DBU integration code path (`dbu-integration/*`, `dbu.emit.ts`, `dbu.options.controller.ts`) **never references the CLIENT role** (grep-confirmed empty). The external DBU **Portal** (`portal.dbugroup.net`) is a separate system that does not authenticate through Postiz at all.
- **Is it legacy?** It is effectively a **second, in-Postiz client portal** — which overlaps the external DBU Portal and partially conflicts with your Rule #1 ("do not create a second client portal"). It appears to predate/parallel the DBU-authoritative-approval model (contract §6: DBU owns the decision, Mapped Out mirrors). It may still serve non-DBU clients or act as a fallback.
- **Can it be deprecated safely?** **Not yet — and not as part of the role work.** Recommendation: **keep `CLIENT` untouched** and orthogonal to the 3 staff roles. Migrate only staff roles (SUPERADMIN/ADMIN/USER); **preserve the `CLIENT` enum value** (dropping it under `db push` = data loss for the live CLIENT user). Whether the in-Postiz client portal should be retired in favour of the DBU Portal is a **separate product decision** for you — flagged, not acted on.
- **Backward compatibility required:** preserve `CLIENT` enum value + `@ClientAllowed` routes + `ClientPortal` render path; do not remove until you confirm it is unused by any real client workflow.

---

## 18. Phase-by-phase roadmap (your directive #6 ordering)

- **Phase 0 (this):** audit ✓ · Instagram investigation ✓ (root cause identified; live confirmation pending DB/Temporal read) · DBU sync risk ✓ · authorization defect inventory ✓. **Stop for approval.**
- **Phase 1 — Design system + shell only** (no data-access changes): one token set, one shell, nav, light/dark, responsive. Staging review. Stop.
- **Phase 2 — Authorization:** centralized object-level authz utility + close the IDOR across the full inventory (§16); extend roles to `SUPER_ADMIN`/`AGENCY_ADMIN`/`ACCOUNT_MANAGER` (safe enum migration, preserve `CLIENT`); invitation flow; user/client/social-account assignment UI; permission hardening (JWT expiry/alg, positional-role fix); **security test suite first**; demonstrate the cross-client attack blocked on staging. Stop.
- **Phase 3 — Clients · Accounts · Dashboard · Calendar · Schedule Post** (+ **Instagram publishing fix + live successful test post** folded in here as the emergency sub-phase, since Accounts/publishing land here). Stop.
- **Phase 4 — Post Library · Media Library · Campaigns · Tasks.** Stop.
- **Phase 5 — Analytics · Reports · AI Recommendations · Performance.** Stop.
- **DBU sync hardening (§8)** is woven through Phases 2–3 (durability/retry/logging/monitoring) without business-logic change; full E2E Epoque acceptance after publishing + sync are proven.

Every phase: local → staging branch → staging image → staging URL + credentials + pages/actions to test + before/after screenshots → **stop for approval**. Production only after approval.

---

## Appendix — key files
- Authz: `apps/backend/src/services/auth/permissions/{roles.guard.ts,permissions.guard.ts,permissions.service.ts}`; `integration.service.ts` (`getScope`/`filterAssignmentsToScope` :176-320); `apps/backend/src/api/routes/{posts.controller.ts,client.controller.ts,users.controller.ts}`.
- Schema: `libraries/nestjs-libraries/src/database/prisma/schema.prisma` (`UserOrganization`, `UserAssignment`, `Role`, `State`).
- Instagram: `libraries/nestjs-libraries/src/integrations/social/{instagram.provider.ts,instagram.standalone.provider.ts,facebook.provider.ts}`; `apps/orchestrator/src/workflows/post-workflows/post.workflow.v1.0.1.ts`; `apps/orchestrator/src/activities/post.activity.ts`; `integration.repository.ts` (`disconnectChannel`).
- DBU: `apps/backend/src/dbu-integration/{dbu.auth.middleware.ts,dbu.integration.controller.ts}`; `libraries/nestjs-libraries/src/database/prisma/posts/dbu.emit.ts`; `apps/backend/src/api/routes/dbu.options.controller.ts`.
- UI: `apps/frontend/src/components/new-layout/layout.component.tsx`; `components/layout/top.menu.tsx`; `app/colors.scss`; `tailwind.config.cjs`.
