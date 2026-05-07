# Chat (Mastra Agents + MCP Tools + IG Webhook) — Claude Code Instructions

## Position in Hierarchy

- **Parent:** [`libraries/nestjs-libraries/CLAUDE.md`](../../CLAUDE.md)
- **Grandparent:** [`/CLAUDE.md`](../../../../CLAUDE.md)
- **Relevant siblings:**
  - [`src/ai/CLAUDE.md`](../ai/CLAUDE.md) — AI Provider System this chat consumes via `factory.textForMastra(...)`
  - [`src/integrations/social/CLAUDE.md`](../integrations/social/CLAUDE.md) — providers triggered by the MCP tools
  - [`apps/orchestrator/CLAUDE.md`](../../../../apps/orchestrator/CLAUDE.md) — workflows triggered by the IG webhook (follow-gate)

## What lives here

The conversational agent layer (Mastra) + MCP tools the agent can invoke + infrastructure for the Instagram webhook (which creates a `PendingPostback` for the Flow engine).

| Subdirectory / file | Content |
|---|---|
| `mastra.service.ts` / `mastra.store.ts` | Mastra agent bootstrap and store |
| `agent.model.resolver.ts` | Resolves the lazy `LanguageModel` via the AI factory |
| `tools/` | 12+ MCP tools the agent can invoke |
| `vector/` | Vectorization helpers for RAG (Knowledge Base) |
| `helpers/` | Shared helpers |
| `start.mcp.ts` | Entry point to initialize the MCP server |
| `auth.context.ts` / `async.storage.ts` | Context propagation (org/profile) between agent and tools |
| `oauth-middleware.ts` / `oauth-types.ts` | OAuth helper for authenticated MCP endpoints |

## Specific Patterns and Rules

### `LanguageModel` is lazy — do not cache

The Mastra Agent **must not** hold a `LanguageModel` in a field. The model is resolved on each call via `factory.textForMastra(orgId, profileId)` (see [`src/ai/CLAUDE.md`](../ai/CLAUDE.md), rule 4).

If the admin changes the provider in `Settings > AI Provider`, the next agent call already reflects the change — no restart needed.

### Every tool follows `AgentToolInterface`

MCP tools live in `tools/`. Each tool implements the contract from `agent.tool.interface.ts`: a Zod input schema, an async `execute`, and a description (`@RulesDescription` decorator when applicable).

### Context propagation is mandatory

User identity (org, profile) flows through `AsyncLocalStorage` in `async.storage.ts` + `auth.context.ts`. Tools that perform domain actions (create a post, look up an integration) read from this context — **never** receive `orgId` directly via the tool schema, because that is forgeable by the prompt.

### Persona is injected into the system prompt

See `persona.helper.ts` in [`src/ai/`](../ai/CLAUDE.md). The active profile's persona is automatically injected into the agent's system prompt — individual tools do not need to load persona.

## Instagram Webhook (HMAC)

Endpoint: `POST /public/ig-webhook` in `apps/backend/src/api/routes/ig-webhook.controller.ts`. It does not live here in `chat/`, but the processing logic (`FlowsService`) lives in `database/prisma/flows/`.

### HMAC validation is mandatory

Validate with **`FACEBOOK_APP_SECRET` AND `INSTAGRAM_APP_SECRET`** (both!) — when the Meta app has both products (Facebook + Instagram) on the same app, Meta may sign with either secret depending on the event source.

Do not trust just one secret; try both before returning `403 Forbidden`.

### Two-step follow-gate flow

**Step 1 — Comment detection:**

1. Webhook delivers a `comment` on the `instagram` object.
2. `FlowsService` decides which flow to trigger based on keywords/rules.
3. If it's `comment_on_post` with the follow-gate enabled: trigger `flow.execution.workflow.ts` (see [`apps/orchestrator/CLAUDE.md`](../../../../apps/orchestrator/CLAUDE.md)).
4. The workflow calls an activity that does `sendPrivateReply` **once** with a postback button ("Quero o link").
5. The activity writes a `PendingPostback` to the DB with `commentId`, `flowId`, `userId`, `payload`.

**Step 2 — Postback (button click):**

1. Webhook delivers a `messaging_postbacks` event.
2. Backend looks up the `PendingPostback` by `payload`.
3. Triggers `follow-gate-resolve.workflow.ts`, which validates the follow, fetches the pending payload, and delivers the final content via a regular DM (`sendMessage`) — **not** via `sendPrivateReply` (already consumed in step 1).

### Why two steps?

Meta limits **one `sendPrivateReply` per comment**. After the postback, the 24h messaging window is open — using a regular DM within that window is allowed without `sendPrivateReply`.

## Key Files in `tools/`

| Tool | Function |
|---|---|
| `extract-urls.tool.ts` | Extract URLs from text + title via fetch |
| `generate.image.tool.ts` | Generate an image via `AiImageService` |
| `generate.video.tool.ts` / `generate.video.options.tool.ts` | Video generation (catalog + execution) |
| `video.function.tool.ts` | Video helpers |
| `integration.list.tool.ts` | List the user's integrations |
| `integration.schedule.post.ts` | Schedule a post via `PostsService` |
| `integration.trigger.tool.ts` | Manual integration trigger |
| `integration.validation.tool.ts` | Validate an integration config |
| `knowledge.query.tool.ts` | Query the profile's Knowledge Base (RAG) |
| `web-search.tool.ts` | Web search via `AiWebSearchService` |
| `tool.list.ts` | Central registry of available tools |
| `tool.context.helper.ts` | Helper to extract org/profile from `AsyncLocalStorage` |

## Common Workflows

### Add a new MCP tool

1. **Spec first** if the tool has non-trivial logic.
2. Create `tools/<name>.tool.ts` exporting an object that satisfies `AgentToolInterface`: `id`, `description`, `inputSchema` (Zod), `execute(input, context)`.
3. **Do not accept `orgId`/`profileId` in the schema** — read them from `AsyncLocalStorage` via `tool.context.helper.ts`.
4. Register in `tool.list.ts`.
5. If the tool consumes AI: use the factory from [`src/ai/`](../ai/CLAUDE.md) — do not call OpenAI/OpenRouter directly.
6. If the tool triggers an integration: use `IntegrationManager` (in `database/prisma/integrations/`).

### Add a new Flow type (e.g., `comment_on_post` for `dm_to_followers`)

1. Update the enum in `database/prisma/schema.prisma` + migration.
2. Routing logic in `flows.service.ts` (in `database/prisma/flows/`).
3. Corresponding activity in `apps/orchestrator/src/activities/flow.activity.ts`.
4. **Update both the wizard AND the Flow Builder node-config-panel** — parity is mandatory (monorepo rule).
5. Spec covering the full path (webhook → service → activity).

### Debug the IG webhook

1. `temporal workflow describe <workflowId>` to see the state.
2. Log `commentId` when creating `PendingPostback` and correlate with the postback event.
3. If HMAC fails: confirm that **BOTH** secrets are set (`FACEBOOK_APP_SECRET`, `INSTAGRAM_APP_SECRET`).
4. Tail the webhook controller logs — events arrive in `entry[]` format with `messaging[]` or `changes[]`.

## Known Pitfalls

1. **Symptom:** `403 Forbidden` on the IG webhook even with correct config → **Cause:** HMAC validation against only one secret. **Fix:** validate against `FACEBOOK_APP_SECRET` AND `INSTAGRAM_APP_SECRET`.
2. **Symptom:** Mastra agent reuses old model after a provider change → **Cause:** model cached on the agent. **Fix:** use `factory.textForMastra(...)` (lazy) every time.
3. **Symptom:** `sendPrivateReply` returns "subcode 2018278" → **Cause:** second call against the same comment. **Fix:** use `sendMessage` (regular DM) in step 2 within the 24h window.
4. **Symptom:** MCP tool receiving an `orgId` forged by the prompt → **Cause:** `orgId` in the input schema. **Fix:** remove from the schema; read from `AsyncLocalStorage`.
5. **Symptom:** RAG returns no results → **Cause:** pgvector not enabled, or embeddings not generated. **Fix:** verify the `pgvector/pgvector:pg17` image and re-run the chunking pipeline; see [`docs/architecture/knowledge-base-rag.md`](../../../../docs/architecture/knowledge-base-rag.md).
6. **Symptom:** new Flow in the wizard does not appear in the visual Flow Builder → **Cause:** only one UI was updated. **Fix:** update **both wizard + node-config-panel** (parity — they share the same `triggerConfig`).

## Commands

```bash
# Chat specs
pnpm jest libraries/nestjs-libraries/src/chat/ --no-coverage
```

## References

- [`docs/architecture/instagram-automations.md`](../../../../docs/architecture/instagram-automations.md) — canonical reference for Flows, credentials, follow-gate, pitfalls
- [`docs/automacoes-instagram.md`](../../../../docs/automacoes-instagram.md) — user guide
- [`docs/architecture/knowledge-base-rag.md`](../../../../docs/architecture/knowledge-base-rag.md) — RAG pipeline
- [`src/ai/CLAUDE.md`](../ai/CLAUDE.md) — `factory.textForMastra`, persona helper
- [`src/integrations/social/CLAUDE.md`](../integrations/social/CLAUDE.md) — IG providers and Meta credential layers
- [`apps/orchestrator/CLAUDE.md`](../../../../apps/orchestrator/CLAUDE.md) — `flow.execution.workflow.ts`, `follow-gate-resolve.workflow.ts`
