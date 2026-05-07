# NestJS Libraries — Instruções para Claude Code

## Posição na Hierarquia

- **Pai:** [`/CLAUDE.md`](../../CLAUDE.md)
- **Irmãos relevantes:**
  - [`apps/backend/CLAUDE.md`](../../apps/backend/CLAUDE.md) — controllers que importam destes services
  - [`apps/orchestrator/CLAUDE.md`](../../apps/orchestrator/CLAUDE.md) — activities que importam destes services
  - [`libraries/react-shared-libraries/CLAUDE.md`](../react-shared-libraries/CLAUDE.md) — counterpart do frontend
- **Filhos (subáreas com CLAUDE.md próprio):**
  - [`src/integrations/social/CLAUDE.md`](src/integrations/social/CLAUDE.md) — providers de redes sociais
  - [`src/ai/CLAUDE.md`](src/ai/CLAUDE.md) — AI Provider System, créditos, persona, KB
  - [`src/chat/CLAUDE.md`](src/chat/CLAUDE.md) — Mastra agents, MCP tools, webhook IG

## O que vive aqui

**Lógica de negócio compartilhada** entre `apps/backend` e `apps/orchestrator`. Subdomínios principais:

| Subdomínio | Conteúdo |
|---|---|
| `database/prisma/` | Schema Prisma + repositories por tabela (`agencies`, `posts`, `credentials`, `profiles`, `users`, `sets`, `flows`, `subscriptions`, etc.) |
| `integrations/social/` | 40+ providers de redes sociais — ver [filho](src/integrations/social/CLAUDE.md) |
| `ai/` | Sistema de Provedores de IA, créditos, persona, KB — ver [filho](src/ai/CLAUDE.md) |
| `chat/` | Mastra agents, MCP tools, webhook IG, knowledge base RAG — ver [filho](src/chat/CLAUDE.md) |
| `dtos/` | Contratos compartilhados (`class-validator` + `class-transformer`) |
| `services/` | Auth, permissions, file upload, email, notifications, etc. |
| `agent/` | Agent Mastra base + tools genéricas |
| `temporal/` | Cliente Temporal compartilhado |
| `redis/` | Pub/sub, cache |
| `crypto/` | AES-256-GCM helpers (mesma `ENCRYPTION_KEY` para OAuth e AI keys) |
| `sentry/` | `initializeSentry`, `FILTER` global, exception capture |
| `test/` | Helpers de teste (`createMock`, `createPrismaRepositoryMock`, `createTestModule`) |

## TDD Obrigatório

Toda feature/bug/refactor segue o ciclo:

1. **RED** — Escrever `.spec.ts` primeiro (deve falhar).
2. **GREEN** — Implementar mínimo para passar.
3. **REFACTOR** — Limpar mantendo testes verdes.

### Regras

- **Nunca** commitar código de produção sem `.spec.ts` correspondente.
- Specs são **co-localizados**: `foo.service.ts` → `foo.service.spec.ts` no mesmo diretório.
- Sufixo é **`.spec.ts`** (não `.test.ts`).
- Rode `pnpm test` (ou `pnpm test:libs`) antes de cada commit.

### Helpers de teste (sempre usar)

Todos exportados de `@gitroom/nestjs-libraries/test`:

```typescript
import {
  createMock,
  createPrismaRepositoryMock,
  createTestModule,
} from '@gitroom/nestjs-libraries/test';
```

| Helper | Quando usar |
|---|---|
| `createMock<T>()` | Mock de qualquer classe via `jest-mock-extended` (não precisa de interface explícita) |
| `createPrismaRepositoryMock('tableName')` | Mock de `PrismaRepository<T>` com `model.[table]` mockado |
| `createTestModule({ service, mocks })` | Factory para `TestingModule` NestJS com mocks automáticos quando há muitas dependências |

### Abordagem por camada

| Camada | O que testar | Como mockar |
|---|---|---|
| **Service** | Lógica de negócio, branching, delegação | `createMock<Repository>()` ou `createTestModule()` |
| **Repository** | Construção de queries Prisma, transformação de dados | `createPrismaRepositoryMock('table')` |
| **Controller** | Camada HTTP, extração de params, guards | `@nestjs/testing` com service mockado |
| **Social Provider** | Formatação de posts, auth URLs, tratamento de erros | Instanciação direta + `jest.spyOn` para HTTP |

### Estrutura do teste

```typescript
describe('NomeClasse', () => {
  describe('nomeMetodo', () => {
    it('deve <comportamento esperado> quando <condicao>', async () => {
      // ARRANGE — preparar mocks e dados
      // ACT — executar o metodo
      // ASSERT — verificar resultado
    });
  });
});
```

### Prioridade de cobertura

1. Services com lógica de negócio (maior valor)
2. Social providers (isolados, sem DI)
3. Repositories com transformação de dados
4. Controllers (camada fina, menor prioridade)

### Exemplos de referência

- Service simples: `database/prisma/sets/sets.service.spec.ts`
- Repository: `database/prisma/sets/sets.repository.spec.ts`
- AI provider system: rode `pnpm jest libraries/nestjs-libraries/src/ai/ --no-coverage` (56 specs)

## Padrões Específicos desta Lib

### Repository pattern (Prisma)

Toda tabela tem um repository em `database/prisma/<tabela>/<tabela>.repository.ts` que estende `PrismaRepository<T>`. Services injetam o repository, **nunca** usam `PrismaService` direto. Excessão única: composições muito específicas que precisam de transação multi-tabela (use `prisma.$transaction(...)` no service).

### DTOs

DTOs compartilhados ficam em `dtos/<area>/<nome>.dto.ts`. Use `class-validator` para validação e `class-transformer` para serialização. **Mantenha sincronizado com o schema Prisma** quando representam entidades do DB.

### Crypto

Para criptografar valores sensíveis (OAuth tokens, AI keys, messaging tokens): use os helpers de `crypto/`. Variável de ambiente: `ENCRYPTION_KEY` (mesma usada em OAuth e em [AI](src/ai/CLAUDE.md)). AES-256-GCM é o esquema canônico.

## Mapa de Arquivos-Chave

| Arquivo | Finalidade |
|---|---|
| `src/database/prisma/schema.prisma` | Schema canônico (45+ models) |
| `src/database/prisma/prisma.service.ts` | `PrismaService` raíz; injetar **só** em repositories |
| `src/database/prisma/<tabela>/<tabela>.repository.ts` | Repositories por tabela (padrão `PrismaRepository<T>`) |
| `src/test/mock.factory.ts` | `createMock`, `createPrismaRepositoryMock` |
| `src/test/create-testing-module.ts` | `createTestModule({ service, mocks })` |
| `src/sentry/initialize.sentry.ts` | Bootstrap Sentry (chamado por `apps/backend/src/main.ts`) |
| `src/sentry/sentry.exception.ts` | `FILTER` global de exceções |
| `src/crypto/` | AES-256-GCM helpers |

## Workflows Comuns

### Adicionar service novo

1. **Spec primeiro** (RED): `<area>/<nome>.service.spec.ts` com cenários esperados, usando `createMock` ou `createTestModule`.
2. **Implementar** `<area>/<nome>.service.ts` mínimo para o spec passar (GREEN).
3. **Repository** se precisa de DB: `<area>/<nome>.repository.spec.ts` + `<area>/<nome>.repository.ts` estendendo `PrismaRepository<T>`.
4. **Refactor** com testes verdes.
5. Registrar provider no `<area>.module.ts` correspondente.
6. Importar do controller (em `apps/backend`) ou activity (em `apps/orchestrator`) — nunca chame Prisma direto de fora do repository.

### Adicionar tabela nova

1. Editar `schema.prisma`, rodar `pnpm prisma-generate` + `pnpm prisma-db-push`.
2. Criar repository com spec (RED → GREEN → REFACTOR).
3. Criar service com spec.
4. Criar DTO em `dtos/` se for entidade de contrato HTTP.
5. **CHANGELOG.md** em `[Unreleased]` (descrever impacto, não detalhe técnico).

## Armadilhas Conhecidas

1. **Sintoma:** spec falhando por "Cannot find module '@gitroom/nestjs-libraries/test'" → **Causa:** path/alias mal configurado. **Correção:** verifique `tsconfig.json` na raiz e o `paths` do nestjs-libraries `tsconfig.lib.json`.
2. **Sintoma:** mock de Prisma "leakando" entre testes → **Causa:** `createPrismaRepositoryMock` reutilizado entre `it`. **Correção:** crie o mock no `beforeEach`.
3. **Sintoma:** service injetando `PrismaService` em vez de repository → **Causa:** atalho. **Correção:** crie repository, mesmo que mínimo. Mantém DI testável e mantém o padrão do monorepo.
4. **Sintoma:** AES decryption retornando lixo após mudar deploy → **Causa:** `ENCRYPTION_KEY` mudou entre ambientes. **Correção:** preserve a key (é a mesma para OAuth e AI keys); rotacionar exige migration de re-encrypt.
5. **Sintoma:** spec passa local mas falha no CI → **Causa:** ordem de testes (estado compartilhado, mock global). **Correção:** isole estado em `beforeEach`/`afterEach`; nunca use `--bail` para mascarar.

## Comandos

```bash
pnpm test                 # Todos os testes (com coverage)
pnpm test:watch           # Watch mode durante desenvolvimento
pnpm test:libs            # Apenas testes das libraries
pnpm test:backend         # Apenas testes do backend (mas a lógica testada vive aqui)
pnpm prisma-generate      # Após mudar schema.prisma
pnpm prisma-db-push       # Aplicar schema ao banco
```

## Referências

- [`src/ai/CLAUDE.md`](src/ai/CLAUDE.md) — AI Provider System detalhado
- [`src/chat/CLAUDE.md`](src/chat/CLAUDE.md) — Mastra, MCP tools, webhook IG
- [`src/integrations/social/CLAUDE.md`](src/integrations/social/CLAUDE.md) — providers e padrões OAuth
- [`docs/architecture/`](../../docs/architecture/) — diagramas e ADRs
