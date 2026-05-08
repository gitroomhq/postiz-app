---
type: skill
name: Test Generation
description: Generate comprehensive test cases for code in the Robô MultiPost monorepo. Use when adding a new service/repository/controller, fixing a bug (write the failing spec first), or refactoring covered behavior. Triggers TDD red-green-refactor with Jest + jest-mock-extended.
skillSlug: test-generation
phases: [E, V]
generated: 2026-02-20
status: filled
scaffoldVersion: "2.0.0"
---

## Stack and tooling

- Test runner: **Jest** with two project roots — `apps/backend` and `libraries/nestjs-libraries` (see `jest.config.ts`).
- Mocking: **`jest-mock-extended`** via `createMock<T>()` exported from `@gitroom/nestjs-libraries/test` (`libraries/nestjs-libraries/src/test/mock.factory.ts`).
- NestJS test harness: `createTestModule({ service, mocks })` (`libraries/nestjs-libraries/src/test/create-testing-module.ts`) for any service with 2+ injected deps.
- Module mocks for ESM (e.g., `ai`, `prisma`): use `jest.mock('module', () => ({ ... }))` at the top of the spec.

## File layout

- Co-locate the spec next to the source: `foo.service.ts` ↔ `foo.service.spec.ts` in the same directory.
- Names mirror the unit under test, no `__tests__` folder unless an existing module already uses one (e.g., `database/prisma/flows/__tests__/`).
- One `describe(ClassName, …)` per file; nested `describe(methodName, …)` per public method.

## Writing imperative

Follow this skeleton when scaffolding a new spec:

```ts
import { ServiceUnderTest } from './service-under-test';
import { Dep1 } from './dep1';
import { createMock } from '@gitroom/nestjs-libraries/test';
import { MockProxy } from 'jest-mock-extended';

// Mock external ESM modules at top-level if used by the service.
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

describe('ServiceUnderTest', () => {
  let service: ServiceUnderTest;
  let dep1: MockProxy<Dep1> & Dep1;

  beforeEach(() => {
    jest.clearAllMocks();
    dep1 = createMock<Dep1>();
    service = new ServiceUnderTest(dep1);
  });

  describe('methodName', () => {
    it('deve <comportamento esperado em pt-BR>', async () => {
      dep1.something.mockResolvedValue({ ... });
      const result = await service.methodName('input');
      expect(result).toEqual({ ... });
      expect(dep1.something).toHaveBeenCalledWith(expect.objectContaining({ ... }));
    });
  });
});
```

Use `createTestModule` instead of `new ServiceUnderTest(...)` when the service has 3+ deps:

```ts
const { service, mocks } = await createTestModule({
  service: PostsService,
  mocks: [PostsRepository, IntegrationManager, ShortLinkService],
});
mocks.get(PostsRepository)!.createPost.mockResolvedValue({ ... });
```

## Conventions

- `it`/`describe` titles in **pt-BR**, imperative form: `'deve gerar legenda nova chamando generateText com prompt de geracao'` (no accents in test names — match the existing style).
- Always `jest.clearAllMocks()` in `beforeEach` to avoid cross-test bleed.
- Use **builder helpers** for object factories (e.g., `buildClient(overrides)` in `ai-text.service.spec.ts`) — keeps tests focused on the behavior, not setup noise.
- Assert with `expect.objectContaining({ ... })` and `expect.stringContaining(...)` instead of full equality when only a few fields matter — keeps specs robust to additive changes in payloads.
- Prefer `mockResolvedValue` / `mockRejectedValue` over `mockImplementation` unless the impl branches.
- Spec only public API; never reach into private methods. If a private path needs coverage, refactor it into a collaborator that can be mocked.

## TDD workflow (mandatory per `CLAUDE.md`)

1. **RED** — write the failing spec capturing the bug or new behavior.
2. **GREEN** — minimum code to pass.
3. **REFACTOR** — tighten while keeping the spec green.

For bugfixes, the failing spec is the proof the bug existed. Without a `.spec.ts` change, the PR is incomplete.

## Coverage targets

- Default: every service public method has at least one happy-path spec and one failure spec.
- AI services (`libraries/nestjs-libraries/src/ai/*`) treat 412 Precondition Failed and best-effort fallbacks as required cases — see `ai-text.service.spec.ts` and `ai-web-search.service.spec.ts` as canonical references.
- Repositories: spec the Prisma calls with mocked client (`createMock<PrismaClient>()` patterns in `database/prisma/**/__tests__/`).
- Controllers: usually skip — covered by service specs and e2e. Only spec a controller if it has its own logic (e.g., DTO transforms).

## Running

```bash
pnpm test                  # tudo, com cobertura, formato CI
pnpm test:watch            # watch mode local
pnpm test:backend          # só apps/backend
pnpm test:libs             # só libraries/nestjs-libraries
pnpm test -- foo.service   # filtra por nome
```

## Anti-patterns (don't ship a PR with these)

- Mocks que retornam `undefined` implicitamente — sempre force `mockResolvedValue(...)` ou `mockReturnValue(...)`.
- Specs que `console.log` no fluxo verde — remova antes do commit.
- Snapshot tests para JSON/HTML que mudam constantemente — prefira asserts explícitos.
- Specs em inglês quebrando o padrão pt-BR sem acentos do projeto — siga o que já está no diretório.
- `eslint-disable-next-line` em qualquer lugar — refatore para conformar.
- Mockar o que está sob teste (mocking `ServiceUnderTest`) — só mocka colaboradores.

## Canonical references in this codebase

- `libraries/nestjs-libraries/src/ai/ai-text.service.spec.ts` — service com mock factory, ESM mock, builder helpers.
- `libraries/nestjs-libraries/src/ai/ai-web-search.service.spec.ts` — múltiplos cenários de erro e sanitização.
- `libraries/nestjs-libraries/src/database/prisma/flows/__tests__/` — repositórios Prisma com `__tests__/` folder.
- `libraries/nestjs-libraries/src/test/mock.factory.ts` — `createMock` e `createPrismaRepositoryMock`.
- `libraries/nestjs-libraries/src/test/create-testing-module.ts` — `createTestModule` para serviços com muitas deps.
