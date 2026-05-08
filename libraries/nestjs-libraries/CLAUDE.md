# NestJS Libraries — Claude Code Instructions

## Position in Hierarchy

- **Parent:** [`/CLAUDE.md`](../../CLAUDE.md)
- **Relevant siblings:**
  - [`apps/backend/CLAUDE.md`](../../apps/backend/CLAUDE.md) — controllers that import these services
  - [`apps/orchestrator/CLAUDE.md`](../../apps/orchestrator/CLAUDE.md) — activities that import these services
  - [`libraries/react-shared-libraries/CLAUDE.md`](../react-shared-libraries/CLAUDE.md) — frontend counterpart
- **Children (subareas with their own CLAUDE.md):**
  - [`src/integrations/social/CLAUDE.md`](src/integrations/social/CLAUDE.md) — social media providers
  - [`src/ai/CLAUDE.md`](src/ai/CLAUDE.md) — AI Provider System, credits, persona, KB
  - [`src/chat/CLAUDE.md`](src/chat/CLAUDE.md) — Mastra agents, MCP tools, IG webhook

## What lives here

**Shared business logic** between `apps/backend` and `apps/orchestrator`. Main subdomains:

| Subdomain | Content |
|---|---|
| `database/prisma/` | Prisma schema + repositories per table (`agencies`, `posts`, `credentials`, `profiles`, `users`, `sets`, `flows`, `subscriptions`, etc.) |
| `integrations/social/` | 40+ social media providers — see [child](src/integrations/social/CLAUDE.md) |
| `ai/` | AI Provider System, credits, persona, KB — see [child](src/ai/CLAUDE.md) |
| `chat/` | Mastra agents, MCP tools, IG webhook, knowledge base RAG — see [child](src/chat/CLAUDE.md) |
| `dtos/` | Shared contracts (`class-validator` + `class-transformer`) |
| `services/` | Auth, permissions, file upload, email, notifications, etc. |
| `agent/` | Mastra base agent + generic tools |
| `temporal/` | Shared Temporal client |
| `redis/` | Pub/sub, cache |
| `crypto/` | AES-256-GCM helpers (same `ENCRYPTION_KEY` for OAuth and AI keys) |
| `sentry/` | `initializeSentry`, global `FILTER`, exception capture |
| `test/` | Test helpers (`createMock`, `createPrismaRepositoryMock`, `createTestModule`) |

## TDD is Mandatory

Every feature/bug/refactor follows the cycle:

1. **RED** — Write the `.spec.ts` first (it must fail).
2. **GREEN** — Implement the minimum code to make it pass.
3. **REFACTOR** — Clean up while keeping tests green.

### Rules

- **Never** commit production code without a corresponding `.spec.ts`.
- Specs are **co-located**: `foo.service.ts` → `foo.service.spec.ts` in the same directory.
- The suffix is **`.spec.ts`** (not `.test.ts`).
- Run `pnpm test` (or `pnpm test:libs`) before each commit.

### Test helpers (always use these)

All exported from `@gitroom/nestjs-libraries/test`:

```typescript
import {
  createMock,
  createPrismaRepositoryMock,
  createTestModule,
} from '@gitroom/nestjs-libraries/test';
```

| Helper | When to use |
|---|---|
| `createMock<T>()` | Mock any class via `jest-mock-extended` (no need for an explicit interface) |
| `createPrismaRepositoryMock('tableName')` | Mock a `PrismaRepository<T>` with `model.[table]` mocked |
| `createTestModule({ service, mocks })` | Factory for a NestJS `TestingModule` with auto-mocks when there are many dependencies |

### Approach by layer

| Layer | What to test | How to mock |
|---|---|---|
| **Service** | Business logic, branching, delegation | `createMock<Repository>()` or `createTestModule()` |
| **Repository** | Prisma query construction, data transformation | `createPrismaRepositoryMock('table')` |
| **Controller** | HTTP layer, param extraction, guards | `@nestjs/testing` with mocked service |
| **Social Provider** | Post formatting, auth URLs, error handling | Direct instantiation + `jest.spyOn` for HTTP |

### Test structure

```typescript
describe('ClassName', () => {
  describe('methodName', () => {
    it('should <expected behavior> when <condition>', async () => {
      // ARRANGE — prepare mocks and data
      // ACT — execute the method
      // ASSERT — verify the result
    });
  });
});
```

### Coverage priority

1. Services with business logic (highest value)
2. Social providers (isolated, no DI)
3. Repositories with data transformation
4. Controllers (thin layer, lowest priority)

### Reference examples

- Simple service: `database/prisma/sets/sets.service.spec.ts`
- Repository: `database/prisma/sets/sets.repository.spec.ts`
- AI provider system: run `pnpm jest libraries/nestjs-libraries/src/ai/ --no-coverage` (56 specs)

## Library-Specific Patterns

### Repository pattern (Prisma)

Every table has a repository at `database/prisma/<table>/<table>.repository.ts` extending `PrismaRepository<T>`. Services inject the repository and **never** use `PrismaService` directly. The single exception: very specific compositions that need a multi-table transaction (use `prisma.$transaction(...)` in the service).

### DTOs

Shared DTOs live in `dtos/<area>/<name>.dto.ts`. Use `class-validator` for validation and `class-transformer` for serialization. **Keep them in sync with the Prisma schema** when they represent DB entities.

### Crypto

For encrypting sensitive values (OAuth tokens, AI keys, messaging tokens): use the `crypto/` helpers. Environment variable: `ENCRYPTION_KEY` (the same one used for OAuth and [AI](src/ai/CLAUDE.md)). AES-256-GCM is the canonical scheme.

## Key File Map

| File | Purpose |
|---|---|
| `src/database/prisma/schema.prisma` | Canonical schema (45+ models) |
| `src/database/prisma/prisma.service.ts` | Root `PrismaService`; inject **only** in repositories |
| `src/database/prisma/<table>/<table>.repository.ts` | Per-table repositories (`PrismaRepository<T>` pattern) |
| `src/test/mock.factory.ts` | `createMock`, `createPrismaRepositoryMock` |
| `src/test/create-testing-module.ts` | `createTestModule({ service, mocks })` |
| `src/sentry/initialize.sentry.ts` | Sentry bootstrap (called by `apps/backend/src/main.ts`) |
| `src/sentry/sentry.exception.ts` | Global exception `FILTER` |
| `src/crypto/` | AES-256-GCM helpers |

## Common Workflows

### Add a new service

1. **Spec first** (RED): `<area>/<name>.service.spec.ts` with expected scenarios, using `createMock` or `createTestModule`.
2. **Implement** `<area>/<name>.service.ts` minimally to pass the spec (GREEN).
3. **Repository** if DB access is needed: `<area>/<name>.repository.spec.ts` + `<area>/<name>.repository.ts` extending `PrismaRepository<T>`.
4. **Refactor** with tests green.
5. Register the provider in the corresponding `<area>.module.ts`.
6. Import from a controller (in `apps/backend`) or activity (in `apps/orchestrator`) — never call Prisma directly outside the repository.

### Add a new table

1. Edit `schema.prisma`, run `pnpm prisma-generate` + `pnpm prisma-db-push`.
2. Create the repository with a spec (RED → GREEN → REFACTOR).
3. Create the service with a spec.
4. Create the DTO under `dtos/` if it represents an HTTP contract.
5. **CHANGELOG.md** under `[Unreleased]` (describe the user impact, not the technical detail).

## Known Pitfalls

1. **Symptom:** spec failing with `Cannot find module '@gitroom/nestjs-libraries/test'` → **Cause:** path/alias misconfigured. **Fix:** check `tsconfig.json` at the root and the `paths` in nestjs-libraries `tsconfig.lib.json`.
2. **Symptom:** Prisma mock "leaks" between tests → **Cause:** `createPrismaRepositoryMock` reused across `it` blocks. **Fix:** create the mock in `beforeEach`.
3. **Symptom:** service injecting `PrismaService` instead of a repository → **Cause:** shortcut. **Fix:** create a repository, even if minimal. Keeps DI testable and the monorepo pattern consistent.
4. **Symptom:** AES decryption returning garbage after a deploy change → **Cause:** `ENCRYPTION_KEY` changed between environments. **Fix:** preserve the key (it's the same one for OAuth and AI keys); rotating it requires a re-encrypt migration.
5. **Symptom:** spec passes locally but fails in CI → **Cause:** test ordering (shared state, global mock). **Fix:** isolate state in `beforeEach`/`afterEach`; never use `--bail` to mask the issue.

## Commands

```bash
pnpm test                 # All tests (with coverage)
pnpm test:watch           # Watch mode during development
pnpm test:libs            # Specs in the libraries only
pnpm test:backend         # Specs in the backend (but the logic being tested lives here)
pnpm prisma-generate      # After changing schema.prisma
pnpm prisma-db-push       # Apply the schema to the database
```

## References

- [`src/ai/CLAUDE.md`](src/ai/CLAUDE.md) — AI Provider System in detail
- [`src/chat/CLAUDE.md`](src/chat/CLAUDE.md) — Mastra, MCP tools, IG webhook
- [`src/integrations/social/CLAUDE.md`](src/integrations/social/CLAUDE.md) — providers and OAuth patterns
- [`docs/architecture/`](../../docs/architecture/) — diagrams and ADRs
