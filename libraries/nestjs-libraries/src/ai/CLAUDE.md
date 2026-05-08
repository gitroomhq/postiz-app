# AI Provider System — Claude Code Instructions

## Position in Hierarchy

- **Parent:** [`libraries/nestjs-libraries/CLAUDE.md`](../../CLAUDE.md)
- **Grandparent:** [`/CLAUDE.md`](../../../../CLAUDE.md)
- **Relevant siblings:**
  - [`src/chat/CLAUDE.md`](../chat/CLAUDE.md) — Mastra agents that consume this system's factory
  - [`src/integrations/social/CLAUDE.md`](../integrations/social/CLAUDE.md) — providers using the same encrypted-credential pattern
- **Canonical document:** [`docs/architecture/ai-provider-system.md`](../../../../docs/architecture/ai-provider-system.md) — full schema, services, resolution chain, endpoints, Settings UI, troubleshooting

## What lives here

The Robô MultiPost central AI provider system. Configuration is **per-workspace via UI** (`Settings > AI Provider`), not via env var. Each `kind` (TEXT, IMAGE, VIDEO, WEB_SEARCH) is configurable with provider (OpenRouter or OpenAI direct), API key, model, fallback, and options. Also includes:

- **AI Credits System** — controls how many images/videos each profile can generate per month.
- **Per-profile persona** — voice tone, target audience, preferred CTAs, restrictions, image style.
- **Knowledge Base (RAG)** — PDF/TXT/MD upload with chunking + embeddings, queried via the `knowledgeBaseQuery` tool.

## Golden Rules

### 1. Configuration is per-workspace via the UI

Admin goes to `Settings > AI Provider` and configures each kind. **There is no env-var fallback for provider configuration** (except test credentials). API keys are stored using **AES-256-GCM** (the same `ENCRYPTION_KEY` used for OAuth — see [`libraries/nestjs-libraries/CLAUDE.md`](../../CLAUDE.md)).

### 2. Every resolution goes through `AiProviderResolverService`

```
PROFILE → WORKSPACE with shareDefault → HTTP 412
```

**Never** access `AiCredential` directly — always go through `AiProviderResolverService`. If the credential exists in neither layer, the resolver throws an error that becomes **HTTP 412 Precondition Failed**.

### 3. 412, not 402

`HTTP 402` is intercepted by Postiz's global `layout.context` to open the billing modal. For "AI credential not configured", the semantically correct status is **412 Precondition Failed**. The frontend opens the appropriate modal on top of 412, not 402.

### 4. Use `AiClientFactory` and dedicated services for new consumers

```typescript
import { AiClientFactory } from '@gitroom/nestjs-libraries/ai/ai-client.factory';

// Text: returns a LanguageModel from AI SDK v5
const model = await factory.text(orgId, profileId);

// Image (T2I + I2I): returns base64 (direct fetch, not via AI SDK due to incompatibility)
const base64 = await aiImageService.generate(orgId, prompt, profileId, {
  aspectRatio: '1:1' | '9:16' | '16:9',
  mode: 'T2I' | 'I2I',         // optional, default T2I
  referenceImageUrl: string,   // required when mode='I2I'
});

// Video (T2V + I2V via Kie.ai): polls 30s × 20 (10min max), returns kie.ai-hosted URL
const video = await aiVideoService.generate(orgId, {
  prompt: '...',
  mode: 'T2V' | 'I2V',
  aspectRatio: '1:1' | '9:16' | '16:9',
  referenceImageUrl?: string,
  enrichPrompt?: boolean,      // default true
}, profileId);

// Mastra Agent: returns a lazy async function
//   the model is resolved on EACH agent call, without restarting the instance
const modelFn = await factory.textForMastra(orgId, profileId);
```

### 5. Per-profile override

- The **default** profile (`isDefault=true`) edits the workspace. Changes affect everyone.
- A **secondary** profile can create an override at `scope=PROFILE` without affecting the default.
- Detected on the frontend via the `useCurrentProfile()` hook.

## AI Credits System

Controls how many images/videos each profile can generate per month.

### Operating modes (`AI_CREDITS_MODE`)

| Mode | Behavior |
|------|---|
| `unlimited` (default) | All profiles generate without limit. Usage logged for analytics. |
| `managed` | Credits managed per profile. The default profile (admin) is always unlimited. |

### Precedence chain (managed mode)

```
1. AI_CREDITS_MODE=unlimited           → ALWAYS unlimited (ignores everything)
2. Default profile (isDefault=true)    → always unlimited
3. Profile.aiImageCredits/aiVideoCredits (if set)  → use that value
4. AI_CREDITS_DEFAULT_IMAGES / _VIDEOS → default for new profiles
5. Fallback                            → unlimited (-1)
```

### Special values

| Value | Meaning |
|---|---|
| `null` | Use the env-var default or unlimited fallback |
| `-1` | Unlimited for this profile |
| `0` | Blocked (no credits) |
| `N > 0` | N credits per month |

### Env vars

```env
AI_CREDITS_MODE="unlimited"           # "unlimited" or "managed"
# AI_CREDITS_DEFAULT_IMAGES=50        # default for new profiles (managed)
# AI_CREDITS_DEFAULT_VIDEOS=10
```

### REST endpoints (in the backend)

```
GET  /copilot/credits?type=ai_images|ai_videos  → { credits: number }
GET  /settings/profiles/:id/ai-credits          → config + usage (ADMIN)
PUT  /settings/profiles/:id/ai-credits          → updates config (ADMIN, does not edit default)
GET  /settings/ai-credits/summary               → list of profiles with credits and usage (ADMIN)
```

### Credits-system files

| File | Purpose |
|---|---|
| `database/prisma/subscriptions/subscription.service.ts` | Main credits service |
| `database/prisma/subscriptions/subscription.repository.ts` | Credits/Profile repository |
| `database/prisma/schema.prisma` | `aiImageCredits`/`aiVideoCredits` fields on Profile, `profileId` on Credits |
| `apps/frontend/src/components/settings/ai-credits.settings.component.tsx` | Settings panel |
| `apps/frontend/src/components/launches/ai.image.tsx` / `ai.video.tsx` | Credit badges |
| `database/prisma/subscriptions/__tests__/subscription.service.spec.ts` | Specs |

## Persona and Knowledge Base

### Persona (text)

Each profile can have a **persona**: voice tone, target audience, preferred CTAs, restrictions, image style. Automatically injected into:

- The Mastra agent (see [`src/chat/CLAUDE.md`](../chat/CLAUDE.md))
- The LangGraph generator
- DALL-E prompts

Helper: `persona.helper.ts` in this directory.
Canonical doc: [`docs/architecture/profile-ai-persona.md`](../../../../docs/architecture/profile-ai-persona.md).

### Knowledge Base (RAG vectors)

Per-profile PDF/TXT/MD upload. Pipeline: chunking → embeddings → vector search. Queried by the `knowledgeBaseQuery` tool before the agent generates specific facts.

- **Requires `pgvector/pgvector:pg17`** on Postgres.
- Feature flag: `ENABLE_KNOWLEDGE_BASE` (default `true`).
- Canonical doc: [`docs/architecture/knowledge-base-rag.md`](../../../../docs/architecture/knowledge-base-rag.md).

## Key File Map

| File | Purpose |
|---|---|
| `ai.module.ts` | NestJS module — exports the factory, services, resolver |
| `ai-client.factory.ts` | Canonical factory for consumers (text / textForMastra / image / web-search) |
| `ai-provider-resolver.service.ts` | Resolution chain PROFILE → WORKSPACE → 412 |
| `ai-credential.service.ts` | Credential CRUD with AES-256-GCM encryption |
| `ai-credential.repository.ts` | `AiCredential` repository |
| `ai-credential.schemas.ts` | Zod schemas (config per kind/provider) |
| `ai-catalog.service.ts` | OpenRouter catalog cache (available models) |
| `ai-catalog.static.ts` | Static curated model list (image/video) |
| `ai-text.service.ts` | Text generation service. Also hosts `generatePromptForPicture` and `generatePromptForVideo` (enrichment helpers — ALWAYS output English regardless of input language) |
| `ai-image.service.ts` | Image generation. Dispatch by `mode`: `T2I` (OpenAI `/generations` or OpenRouter chat), `I2I` (OpenAI `/images/edits` multipart, or OpenRouter chat with `image_url`) |
| `ai-video.service.ts` | Video generation via Kie.ai. Dispatch by model family: Seedance (`/api/v1/jobs/createTask`) or Veo 3.x (`/api/v1/veo/generate`). Polls 30s × 20 iterations. Translates kie.ai error codes to friendly Portuguese messages |
| `ai-web-search.service.ts` | Web search service (Tavily) |
| `ai-provider-test.service.ts` | Endpoint to test a credential |
| `persona.helper.ts` | Persona injection into system prompts |

## Common Workflows

### Add a new AI consumer

1. **Do not use a direct HTTP client** to call OpenAI/OpenRouter. Use `AiClientFactory`.
2. **Text** (LangGraph, Mastra, direct code path): `factory.text(orgId, profileId)`.
3. **Mastra Agent**: `factory.textForMastra(orgId, profileId)` — returns a lazy async function. **Critical**: do not cache the model inside the agent; resolve on each call.
4. **Image**: `aiImageService.generate(orgId, prompt, profileId)`.
5. **Web Search**: `aiWebSearchService.search(...)`.
6. Spec first (RED): mock the resolver/factory with `createMock`.

### Add a new provider (e.g., a new image provider)

1. Define a Zod schema in `ai-credential.schemas.ts`.
2. Update `ai-catalog.static.ts` with supported models.
3. Extend `AiClientFactory` with a constructor for the provider.
4. UI in `apps/frontend/src/components/settings/ai-provider/` with card + form.
5. Add specs covering PROFILE → WORKSPACE resolution.
6. Document in [`docs/architecture/ai-provider-system.md`](../../../../docs/architecture/ai-provider-system.md).

### Change credits policy

Everything goes through `subscription.service.ts`. If you change the precedence chain, update both the specs in `subscription.service.spec.ts` AND the UI tests on the frontend.

## Known Pitfalls

1. **Symptom:** Billing modal opens when AI is not configured → **Cause:** controller returned 402. **Fix:** switch to 412 Precondition Failed.
2. **Symptom:** Mastra Agent reuses old model after admin changes provider → **Cause:** model cached inside the Agent. **Fix:** use `factory.textForMastra(...)` (lazy resolver) — do not store `LanguageModel` in a field.
3. **Symptom:** AES decryption returns garbage → **Cause:** `ENCRYPTION_KEY` changed between deploys. **Fix:** preserve the key. Rotating it requires a bulk re-encrypt migration.
4. **Symptom:** OpenAI image generation works via curl but fails in the app → **Cause:** AI SDK image incompatibility. **Fix:** `AiImageService.generate` uses **direct fetch**, not AI SDK. Do not migrate.
5. **Symptom:** credits do not decrement for a new profile → **Cause:** `Credits.profileId` not populated when created. **Fix:** see `subscription.service.spec.ts` for the correct creation path.
6. **Symptom:** unexpected "unlimited fallback" in managed mode → **Cause:** `AI_CREDITS_MODE` not set, or `aiImageCredits=null` falls into the fallback. **Fix:** review the precedence chain (order matters).
7. **Symptom:** I2I via OpenAI returns `400 "Unknown parameter: 'quality'"` → **Cause:** `/v1/images/generations` accepts `quality` but `/v1/images/edits` (used for I2I) does NOT. **Fix:** `generateOpenAiEdit` MUST omit `quality` from FormData even when present in `credential.options`. T2I keeps applying it via `/generations`.
8. **Symptom:** Image/video generated has Portuguese text or weird translation artifacts → **Cause:** the LLM enriching the prompt returned in the user's input language. **Fix:** `generatePromptForPicture`/`generatePromptForVideo` system prompts contain explicit "Always respond in ENGLISH, regardless of input language — image/video models perform significantly better with English". Don't translate them; keep output English.
9. **Symptom:** `Cache-Control` style staleness — admin changed model in Settings but the modal still shows old options → **Cause:** Redis catalog cache. **Fix:** `getCatalog` already bypasses cache for static providers (kieai/tavily/openai). For OpenRouter, hit `POST /ai/catalog/refresh` or wait 1h TTL.
10. **Symptom:** Kie.ai video generation fails with `code=402 "Credits insufficient"` (their billing) but our backend returns generic 502 → **Cause:** `AiVideoService.translateKieaiError` exists but isn't applied. **Fix:** ensure controller propagates `error.message` from HttpException — the frontend already prefers `detail.message` over generic toast.

## Useful Commands

```bash
# AI Provider System specs (126 specs covering text, image T2I/I2I, video T2V/I2V, web search, resolver, factory, catalog, credentials)
pnpm jest libraries/nestjs-libraries/src/ai/ --no-coverage

# AI + Chat (124 + chat specs ~140 total) — the agent's tool layer also lives next door
pnpm jest libraries/nestjs-libraries/src/ai libraries/nestjs-libraries/src/chat --no-coverage

# Clear OpenRouter catalog cache (only OpenRouter is cached; kieai/tavily/openai bypass cache for instant pickup of code changes)
curl -X POST -H "Cookie: <session>" http://localhost:3000/ai/catalog/refresh
```

## References

- [`docs/architecture/ai-provider-system.md`](../../../../docs/architecture/ai-provider-system.md) — schema, services, resolution chain, UI, troubleshooting (REQUIRED READING before changing anything)
- [`docs/architecture/profile-ai-persona.md`](../../../../docs/architecture/profile-ai-persona.md)
- [`docs/architecture/knowledge-base-rag.md`](../../../../docs/architecture/knowledge-base-rag.md)
- [`docs/architecture/credential-validation.md`](../../../../docs/architecture/credential-validation.md)
- [`src/chat/CLAUDE.md`](../chat/CLAUDE.md) — Mastra agents that consume this system
