# Orchestrator (NestJS + Temporal.io) — Claude Code Instructions

## Position in Hierarchy

- **Parent:** [`/CLAUDE.md`](../../CLAUDE.md)
- **Relevant siblings:**
  - [`apps/backend/CLAUDE.md`](../backend/CLAUDE.md) — controllers that trigger workflows here
  - [`libraries/nestjs-libraries/CLAUDE.md`](../../libraries/nestjs-libraries/CLAUDE.md) — services that activities consume
  - [`libraries/nestjs-libraries/src/integrations/social/CLAUDE.md`](../../libraries/nestjs-libraries/src/integrations/social/CLAUDE.md) — providers called by activities
  - [`libraries/nestjs-libraries/src/chat/CLAUDE.md`](../../libraries/nestjs-libraries/src/chat/CLAUDE.md) — IG webhook that creates a `PendingPostback` resolved here

## What lives here

A Temporal.io worker that runs **workflows** (durable orchestration) and **activities** (real calls to external services). Covers: post scheduling, autopost, repost, OAuth token refresh, email sending, missing-post detection, streaks, and the **Instagram Flow engine** (follow-gate, comments, DMs).

Do not confuse with `apps/backend`: the backend creates workflows (via `WorkflowClient`); the orchestrator is the **worker** that executes them.

## Specific Patterns and Rules

### Workflows × Activities (Temporal golden rule)

- **Workflows are deterministic.** Never call HTTP APIs, read/write the DB, or use `Date.now()` directly inside a workflow — that breaks deterministic re-execution.
- **Activities are where I/O happens.** Every call to `IntegrationManager`, Prisma, the Meta API, etc. is wrapped in an activity.
- Workflows orchestrate by calling activities via `proxyActivities<typeof import('../activities/...')>({ ... })`.

### Signals for pending flows

Signals (`@SignalMethod`) are only delivered to a live workflow. The pattern in use:

- `flow.execution.workflow.ts` creates a **`PendingPostback`** in the DB and waits.
- `follow-gate-resolve.workflow.ts` receives the webhook signal (postback button clicked) and resumes the original flow.
- Without the signal, the workflow times out per the configured timeout.

### Instagram host/token routing (`resolveIgRoute`)

**Single decision** of which host (`graph.facebook.com` vs `graph.instagram.com`) and which token (Page Access Token, registered IG User Token, "standalone" IG User Token) to use for each comment activity.

Canonical function: `resolveIgRoute` in `libraries/nestjs-libraries/src/integrations/social/instagram-route.resolver.ts`.
Local wrapper: `FlowActivity.resolveIgRoute(integration)` in `src/activities/flow.activity.ts` (lines 29–36) which injects `_instagramMessagingService`.

**Resolution priority**:

1. `providerIdentifier === 'instagram-standalone'` → IG User Token from `Integration.token`, host `graph.instagram.com`
2. IG User Token registered in `Credentials.instagramTokens` → host `graph.instagram.com`
3. Fallback: Page Access Token from `Integration.token`, host `graph.facebook.com`

**Never** hardcode host/token — always go through `resolveIgRoute`.

### Two-step follow-gate (`comment_on_post`)

1. Comment detected by the IG webhook (in `apps/backend/src/api/routes/ig-webhook.controller.ts`).
2. Backend triggers `flow.execution.workflow.ts` → activity sends `sendPrivateReply` ONCE with a postback button ("Quero o link"). Saves `PendingPostback` to the DB.
3. User clicks the button → IG webhook delivers the postback → backend triggers `follow-gate-resolve.workflow.ts`.
4. `follow-gate-resolve.workflow.ts` validates the follow, looks up the `PendingPostback`, and dispatches the final delivery (DM with payload, or new message).

**Critical rule**: `sendPrivateReply` can only be called **ONCE per comment** (Meta limit). The second message must use a regular DM (`sendMessage`) within the 24h messaging window opened by the postback.

## Key File Map

| File | Purpose |
|---|---|
| `src/main.ts` | NestJS bootstrap + Temporal Worker registration |
| `src/app.module.ts` | Root module with activity providers |
| `src/health.controller.ts` | HTTP healthcheck |
| `src/workflows/index.ts` | Re-exports all registered workflows |
| `src/workflows/autopost.workflow.ts` | Auto-generation + scheduling of posts |
| `src/workflows/post-workflows/` | Real publishing pipeline per channel |
| `src/workflows/flow.execution.workflow.ts` | Flow engine (Instagram automations) — step 1 of follow-gate |
| `src/workflows/follow-gate-resolve.workflow.ts` | Step 2 of follow-gate (resolves postback) |
| `src/workflows/refresh.token.workflow.ts` | Periodic OAuth token refresh |
| `src/workflows/repost.workflow.ts` | Scheduled repost |
| `src/workflows/missing.post.workflow.ts` | Failed-post detector + retry |
| `src/workflows/digest.email.workflow.ts` / `send.email.workflow.ts` / `streak.workflow.ts` | Email digests, direct sends, streaks |
| `src/activities/flow.activity.ts` | Flow activities (comment, DM, follow check) — `resolveIgRoute` wrapper |
| `src/activities/post.activity.ts` | Real publishing activity (calls `IntegrationManager`) |
| `src/activities/integrations.activity.ts` | Integration activities (refresh token, etc.) |
| `src/signals/` | Workflow signal definitions |

## Common Workflows

### Add a new workflow

1. **Spec first** (TDD): if the logic is complex (non-trivial orchestration), write the spec for the corresponding activity in libraries (see [`libraries/nestjs-libraries/CLAUDE.md`](../../libraries/nestjs-libraries/CLAUDE.md) for the spec pattern).
2. Create `src/workflows/<name>.workflow.ts` exporting an async function that takes params and returns a result.
3. Activities consumed by the workflow go in `src/activities/<name>.activity.ts` or in an existing activity. **The real logic lives in a library service**; the activity only wraps it for Temporal.
4. Register in `src/workflows/index.ts`.
5. **Triggering the workflow**: from the backend, via `WorkflowClient` (see existing controllers in `apps/backend/src/api/routes/` for examples).
6. **CHANGELOG.md** under `[Unreleased]`.

### Add a new activity

1. Real service in `libraries/nestjs-libraries/src/...` with a spec.
2. Activity in `src/activities/...activity.ts` injecting the service and exporting a method. The activity alone **does not** contain logic — it just calls the service.
3. Register the provider in `app.module.ts` if class-based.

### Add a new step to the IG Flow engine

Every Flow step that touches Meta endpoints must go through `resolveIgRoute`. See `flow.activity.ts:65` and `:129` as references. For a new step type (beyond `comment_on_post`, `dm`, etc.), update **both the wizard AND the Flow Builder node-config-panel** — they share the same `triggerConfig` JSON.

## Known Pitfalls

1. **Symptom:** workflow "stuck" without completing even after an external signal → **Cause:** signal dispatched to the wrong workflowId, or workflow already expired. **Fix:** log `workflowId` when creating `PendingPostback` and when receiving the webhook; check `temporal workflow describe <id>`.
2. **Symptom:** Instagram comment activity returning unexpected 400/403 → **Cause:** wrong host/token (e.g., trying to use a Page Access Token against `graph.instagram.com`). **Fix:** confirm you are using `resolveIgRoute(integration)`, not a hardcoded value.
3. **Symptom:** second `sendPrivateReply` returns "subcode 2018278" → **Cause:** Meta only allows ONE private reply per comment. **Fix:** the second message must be a regular DM within the 24h window opened by the postback.
4. **Symptom:** non-deterministic workflow on replay (`Workflow execution had errors`) → **Cause:** direct API/DB/`Date.now()` call inside the workflow. **Fix:** move the call to an activity.
5. **Symptom:** new Flow field does not appear in the visual Flow Builder → **Cause:** only the wizard was updated. **Fix:** also update the `node-config-panel` of the Flow Builder — both consume the same `triggerConfig` (parity rule).
6. **Symptom:** IG webhook delivers the postback but `follow-gate-resolve` does not fire → **Cause:** invalid HMAC or `PendingPostback` was not created/has expired. **Fix:** see [`libraries/nestjs-libraries/src/chat/CLAUDE.md`](../../libraries/nestjs-libraries/src/chat/CLAUDE.md) for webhook validation (FACEBOOK_APP_SECRET + INSTAGRAM_APP_SECRET).

## Commands

```bash
pnpm build:orchestrator
pnpm dev                  # Boots orchestrator alongside other apps
# Local Temporal UI at http://localhost:8233 (docker-compose.dev.yaml)
```

## References

- [`docs/architecture/instagram-automations.md`](../../docs/architecture/instagram-automations.md) — full map of the IG Flow subsystem
- [`docs/automacoes-instagram.md`](../../docs/automacoes-instagram.md) — user guide for automations
- [`libraries/nestjs-libraries/src/chat/CLAUDE.md`](../../libraries/nestjs-libraries/src/chat/CLAUDE.md) — IG webhook, HMAC validation, PendingPostback
- [`libraries/nestjs-libraries/src/integrations/social/CLAUDE.md`](../../libraries/nestjs-libraries/src/integrations/social/CLAUDE.md) — `resolveIgRoute`, IG providers, three Meta credential layers
