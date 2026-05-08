---
type: skill
name: Api Design
description: Design REST endpoints for the NestJS backend (apps/backend) following Robô MultiPost conventions — DTOs with class-validator, Swagger decorators, correct HTTP status codes (412 for missing config, never 402), explicit rate limits, and per-profile credential scoping. Use when adding a new endpoint, evolving an existing contract, or reviewing an API proposal.
skillSlug: api-design
phases: [P, R]
generated: 2026-02-20
status: filled
scaffoldVersion: "2.0.0"
---

## Where endpoints live

| Path | Purpose |
|---|---|
| `apps/backend/src/api/routes/<area>.controller.ts` | Internal API consumed by `apps/frontend` |
| `apps/backend/src/public-api/routes/v1/<area>.controller.ts` | Public API consumed by external clients (versioned) |

Pick `public-api/v1/` only when the endpoint is part of the documented external contract; default to `api/routes/` for everything the frontend uses.

## Method and path conventions

- Use plural nouns: `/posts`, `/integrations`, `/ai/credentials/:kind`.
- Verbs on actions only when REST shape doesn't fit: `/ai/text/caption`, `/ai/web-search/generate-post`, `/auth/login`.
- Path params are stable identifiers; query params are filters/options.
- Per-profile resources include `?profileId=...` query param when the endpoint is workspace-default-scoped but allows profile override (see `/ai/credentials/:kind`).

## DTOs (Required)

Every body-bearing endpoint has a DTO under `libraries/nestjs-libraries/src/dtos/<area>/`:

```ts
import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';

export class GenerateCaptionDto {
  @IsString()
  @MaxLength(8000)
  content!: string;

  @IsEnum(['generate', 'improve'])
  action!: 'generate' | 'improve';

  @IsOptional()
  @IsString()
  identifier?: string;
}
```

Reject `@Body() body: any` in any new controller. Reject inline interfaces in controllers — DTOs live in their own files.

## Swagger decorators (Required)

```ts
@Post('caption')
@ApiOperation({ summary: 'Gera ou melhora legenda via LLM configurado' })
@ApiResponse({ status: 200, type: CaptionResponseDto })
@ApiResponse({ status: 412, description: 'AI provider nao configurado' })
@Throttle({ default: { limit: 30, ttl: 60_000 } })
async caption(@Body() dto: GenerateCaptionDto, @GetUserFromRequest() user) {
  return this.aiTextService.caption(user.organizationId, dto.action, dto.content);
}
```

Without `@ApiOperation` and `@ApiResponse`, the contract is invisible to consumers and review will reject.

## HTTP status codes (canonical for this codebase)

| Code | Use for |
|---|---|
| 200 | success |
| 201 | created (POST that produces a new resource) |
| 204 | success without body (DELETE, idempotent ops) |
| 400 | malformed request, validation failed (class-validator handles automatically) |
| 401 | not authenticated |
| 403 | authenticated but not authorized (use `AbilityPolicy`) |
| 404 | resource not found |
| 409 | conflict (e.g., duplicate slug) |
| **412** | **AI/credential pre-condition not met — use this, NOT 402** |
| 422 | semantic validation failure (after class-validator) |
| 429 | rate limit hit |
| 500 | server error (don't return on purpose; let exception filter handle) |

**Critical rule:** missing AI configuration returns **412 Precondition Failed**, never 402. The frontend interceptor that catches 402 opens the billing modal — you don't want that for self-hosted AI config issues. (See `feedback_*` and `docs/architecture/ai-provider-system.md`.)

## Rate limiting (Required for cost-sensitive)

- AI endpoints (`/ai/text/caption`, `/ai/video/generate`, `/ai/web-search/generate-post`): explicit `@Throttle({ default: { limit: 30, ttl: 60_000 } })` — overrides the global default (which is 30/h, way too generous for AI).
- External-API endpoints (Tavily search, KieAi video): same — protect against accidental cost bombs.
- Auth endpoints (`/auth/login`, `/auth/forgot`): tighter limit (5/min) to slow brute force.
- Internal admin-only endpoints can rely on the global default if not cost-sensitive.

## Auth and authorization

- All authenticated endpoints decorate `@UseGuards(AuthGuard)` (or rely on the module-level guard).
- For org/profile-scoped data: extract via `@GetOrgFromRequest()`, `@GetProfileFromRequest()`, `@GetUserFromRequest()`.
- For policy checks, use `AbilityPolicy` from `apps/backend/src/services/auth/permissions/permissions.ability.ts`.
- Reject endpoints that read `request.user` directly without typing — use the decorators above.

## Per-profile vs per-workspace scoping

When the endpoint touches data that can be scoped per-profile (AI credentials, persona, knowledge base):

- Default scope is workspace (org-level).
- Accept optional `?profileId=...` query param for explicit profile-level override.
- Resolution chain: profile → workspace (with `shareDefault`) → 412.
- Don't conflate workspace admin with profile admin — different policies.

(See `AiProviderResolverService` for the canonical implementation; mirror its shape for new per-profile resources.)

## Service contract (Required)

The controller is thin; the service does the work. Per `CLAUDE.md`:

- Controller body: validate DTO (automatic via pipe) → call service → return result.
- Service does business logic, calls repositories, calls external APIs, manages errors.
- If the controller has more than ~5 lines beyond the service call, extract to service.

## Error handling

- Throw NestJS `HttpException` subclasses (`PreconditionFailedException`, `ForbiddenException`, etc.) from the service.
- Don't catch broadly to "log and re-throw" — let the global filter handle it (`HttpExceptionFilter` in `libraries/nestjs-libraries/src/services/exception.filter.ts`).
- For expected user errors (412 missing config), include a structured response body: `{ message, code, hint }`.
- Sanitize secrets (Bearer tokens, API keys) from error messages before they bubble up.

## SSRF and external HTTP

When the endpoint takes a URL or hostname from the user (web search, extract URLs):

- Validate `new URL(input)` — reject thrown errors as 400.
- Reject hostname matching: `localhost`, `127.*`, `10.*`, `192.168.*`, `172.16-31.*`, `169.254.*`, IPv6 link-local.
- Reject protocols other than `http(s)`.
- Use the patterns already in `ai-web-search.service.ts`.

## Idempotency

- POST endpoints that create resources: idempotent if natural key exists (e.g., `slug`); otherwise document non-idempotency in `@ApiOperation`.
- DELETE: always idempotent (404 → 204 if already deleted).
- Background tasks (Temporal activities): require an idempotency key; document it in the activity signature.

## Pagination, filtering, sorting

- Cursor-based for high-cardinality lists (posts, integrations); offset-based only for small admin lists.
- Standard query params: `cursor`, `limit` (default 20, max 100), `sort` (e.g., `sort=-createdAt`).
- Filtering: explicit param per filter (`status=published`), don't accept arbitrary query selectors.

## Anti-patterns

- Returning 402 for AI config errors — use 412.
- Inline interfaces in controllers — extract to DTO file.
- Skipping `@ApiOperation` / `@ApiResponse` — public contract is invisible.
- Reading `process.env` inside the controller — values come from `ConfigService` or service layer.
- Trusting client-provided `organizationId` / `profileId` from the body — extract from the auth context only.
- Running heavy work in the controller (image gen, video poll, long DB query) — push to a queue or Temporal workflow.

## Testing the contract

- DTO unit specs: validate that bad inputs are rejected (`class-validator` integration).
- Service unit specs: cover happy path + each error code.
- Controller specs: usually skipped (covered by service); spec only when controller has its own logic.
- Manual smoke: `curl` with valid + invalid + unauthorized requests; document in PR test plan.

## Canonical references

- `apps/backend/CLAUDE.md` — backend layering and conventions.
- `libraries/nestjs-libraries/src/ai/ai-text.controller.ts` — reference shape for AI endpoints (DTO, Swagger, throttle, 412).
- `libraries/nestjs-libraries/src/ai/ai-provider-resolver.service.ts` — per-profile resolution chain.
- `libraries/nestjs-libraries/src/dtos/` — existing DTO catalog; pattern your new DTO after these.
- `apps/backend/src/services/auth/permissions/permissions.ability.ts` — `AbilityPolicy` for authorization.
- `code-review` skill — what reviewers will check on the contract.
