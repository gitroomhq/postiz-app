# Backend (NestJS) — Instruções para Claude Code

## Posição na Hierarquia

- **Pai:** [`/CLAUDE.md`](../../CLAUDE.md)
- **Irmãos relevantes:**
  - [`apps/frontend/CLAUDE.md`](../frontend/CLAUDE.md) — UI que consome esta API
  - [`apps/orchestrator/CLAUDE.md`](../orchestrator/CLAUDE.md) — workflows Temporal disparados pelos controllers
  - [`libraries/nestjs-libraries/CLAUDE.md`](../../libraries/nestjs-libraries/CLAUDE.md) — onde mora a lógica de negócio que estes controllers chamam

## O que vive aqui

API REST NestJS. **Controllers finos** que validam HTTP, extraem params/usuário e delegam para services em `libraries/nestjs-libraries/src/`. Apenas o módulo HTTP (`api.module.ts` + `app.module.ts`), `main.ts`, e a coleção de controllers em `src/api/routes/` e `src/public-api/`. Lógica de negócio **nunca** vive aqui — sempre em libs.

## Padrão Arquitetural Obrigatório

```
Controller >> Service >> Repository
```

Quando há orquestração entre múltiplos services:

```
Controller >> Manager >> Service >> Repository
```

### Regras

- **Nunca pular camada.** Controller chama Service (ou Manager), nunca Repository diretamente. Service chama Repository, nunca Prisma direto.
- Controllers **só importam de libs** (`@gitroom/nestjs-libraries/*`, `@gitroom/helpers/*`). Não escreva services novos em `apps/backend/src/services/` — use `libraries/nestjs-libraries/src/`.
- DTOs ficam em `libraries/nestjs-libraries/src/dtos/` (não em `apps/backend`).
- Use `@CurrentUser()` e `@CurrentOrg()` decorators (de `libraries/nestjs-libraries/src/services/auth/permissions/`) para extrair o usuário/org autenticado.
- Erros HTTP são `HttpException` com status semântico — **não** use 402 para "credencial não configurada" (interceptado pelo modal de billing global do Postiz). Use **412 Precondition Failed**. Detalhes em [`libraries/nestjs-libraries/src/ai/CLAUDE.md`](../../libraries/nestjs-libraries/src/ai/CLAUDE.md).

## Mapa de Arquivos-Chave

| Arquivo | Finalidade |
|---|---|
| `src/main.ts` | Bootstrap NestJS, `initializeSentry()`, listen na porta |
| `src/app.module.ts` | Root module — registra `SentryModule`, `FILTER` global, módulos de api/public-api |
| `src/api/api.module.ts` | Módulo HTTP da API privada (controllers que requerem auth) |
| `src/api/routes/` | 30+ controllers REST (auth, posts, integrations, ai-*, copilot, flows, ig-webhook, etc.) |
| `src/public-api/` | API pública versionada (`/v1/`) — autenticada por API key |
| `src/services/` | Pequena camada de utilitários do app HTTP (não confundir com services de domínio em libs) |

## Workflows Comuns

### Adicionar uma rota REST nova

1. **Definir contrato** (API-First): endpoint, payload (DTO em `libraries/nestjs-libraries/src/dtos/`), response.
2. **Spec primeiro** (TDD): `foo.service.spec.ts` em `libraries/nestjs-libraries/src/.../foo.service.ts` com o comportamento esperado. Use `createMock`/`createTestModule` (ver [`libraries/nestjs-libraries/CLAUDE.md`](../../libraries/nestjs-libraries/CLAUDE.md)).
3. **Implementar Service e Repository** em `libraries/nestjs-libraries/`.
4. **Criar Controller** em `src/api/routes/foo.controller.ts`. Importar service da lib. Aplicar guards/decorators (`@UseGuards(AuthService)`, `@CurrentUser()`).
5. **Registrar** o controller em `src/api/api.module.ts` (array `controllers:`).
6. **Tradução do frontend** (se houver UI): chave em `pt/translation.json` e `en/translation.json` (ver [`apps/frontend/CLAUDE.md`](../frontend/CLAUDE.md)).
7. **CHANGELOG.md** em `[Unreleased]`.

### Adicionar guard ou interceptor

Nunca crie no `apps/backend` — escreva em `libraries/nestjs-libraries/src/services/auth/` (guards) ou `libraries/nestjs-libraries/src/services/` (interceptors) e importe.

### Webhooks externos (ex.: Instagram, Stripe)

Webhooks vivem em `src/api/routes/*.webhook.controller.ts`. **Validar HMAC sempre** antes de processar. Para IG, ver [`libraries/nestjs-libraries/src/chat/CLAUDE.md`](../../libraries/nestjs-libraries/src/chat/CLAUDE.md) (validação com `FACEBOOK_APP_SECRET` E `INSTAGRAM_APP_SECRET`).

## Sentry (backend)

Backend usa `@sentry/nestjs` (não `@sentry/nextjs`):

```typescript
import * as Sentry from '@sentry/nestjs';
import { SentryModule } from '@sentry/nestjs/setup';
import { initializeSentry } from '@gitroom/nestjs-libraries/sentry/initialize.sentry';
import { FILTER } from '@gitroom/nestjs-libraries/sentry/sentry.exception';
```

- Inicialização: `initializeSentry()` em `main.ts` (helper interno encapsula `Sentry.init`).
- Filter global de exceções: `FILTER` de `sentry.exception` registrado em `app.module.ts` como `APP_FILTER`.
- Para captura manual em controller/service, use `Sentry.captureException(error)` ou `Sentry.captureMessage(...)`.
- Setup do Sentry de **frontend** (`@sentry/nextjs`, console logging integration, `logger.fmt`) está em [`apps/frontend/CLAUDE.md`](../frontend/CLAUDE.md).

## Armadilhas Conhecidas

1. **Sintoma:** `Cannot inject ... PrismaService` em service novo → **Causa:** service tentando acessar Prisma direto. **Correção:** crie um `*.repository.ts` que estende `PrismaRepository<T>` e injete o repository no service.
2. **Sintoma:** modal de billing abrindo quando deveria ser erro de configuração → **Causa:** controller retornando `HTTP 402`. **Correção:** use `HTTP 412 Precondition Failed`.
3. **Sintoma:** `RequestContext` ou `@CurrentUser()` retornando `undefined` → **Causa:** rota não está atrás do `AuthService` guard. **Correção:** aplique `@UseGuards(AuthService)` no controller ou na rota.
4. **Sintoma:** importou de `@gitroom/backend/...` em uma lib → **Causa:** dependência circular. **Correção:** libs **nunca** importam do backend; apenas o backend importa de libs.
5. **Sintoma:** novo endpoint não aparece no Swagger → **Causa:** controller não registrado em `api.module.ts`. **Correção:** adicione no array `controllers:`.
6. **Sintoma:** TS error `'createTestModule' does not exist` em spec novo → **Causa:** path de import errado. **Correção:** `import { createTestModule } from '@gitroom/nestjs-libraries/test'`.

## Comandos

```bash
pnpm dev-backend          # Sobe backend + frontend
pnpm build:backend        # Build do backend isolado
pnpm test:backend         # Specs apenas do backend
pnpm test:libs            # Specs das libs (onde a maior parte dos testes do backend mora)
```

## Referências

- [`libraries/nestjs-libraries/CLAUDE.md`](../../libraries/nestjs-libraries/CLAUDE.md) — onde mora a maior parte da lógica testada por estas rotas
- [`docs/architecture/ai-provider-system.md`](../../docs/architecture/ai-provider-system.md) — endpoints de AI (REST + erro 412)
- [`docs/architecture/instagram-automations.md`](../../docs/architecture/instagram-automations.md) — webhook IG e fluxo follow-gate
- [`docs/planning/agents.md`](../../docs/planning/agents.md) — contexto de produto
