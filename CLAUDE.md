# Robô MultiPost — Instruções para Claude Code

Este projeto é o **Robô MultiPost**, um fork do [Postiz](https://github.com/gitroomhq/postiz-app) (AGPL-3.0), adaptado para a comunidade Automação Sem Limites. É um scheduler de redes sociais self-hosted com suporte a 33+ canais, agendamento via calendário, analytics, biblioteca de mídia e integração com IA.

## Stack Principal

- **Backend:** NestJS (TypeScript) — `apps/backend`
- **Frontend:** Next.js 14 + React 18 + Tailwind CSS 3 — `apps/frontend`
- **Orchestrator:** NestJS + Temporal.io (jobs em background) — `apps/orchestrator`
- **ORM:** Prisma + PostgreSQL
- **Package manager:** PNPM (monorepo) — **nunca use npm ou yarn**
- **IA:** Mastra framework + MCP (Model Context Protocol)

## Estrutura do Monorepo

```
apps/
  backend/       ← API REST (NestJS)
  frontend/      ← UI (Next.js 14 + React 18)
  orchestrator/  ← Temporal workflows e activities (NestJS)
  extension/     ← Browser extension
  cli/           ← CLI tool (publicado como `postiz` no npm)
  sdk/           ← SDK Node.js (publicado como `@postiz/node`)
  commands/      ← Microserviço de comandos background

libraries/
  nestjs-libraries/      ← Código compartilhado backend/orchestrator
    integrations/social/ ← 33 providers de redes sociais
    database/prisma/     ← Schema Prisma + migrações
    chat/                ← Agentes e MCP tools
  react-shared-libraries/ ← Código compartilhado frontend
    translation/locales/ ← 17 idiomas (pt, en, es, fr, de, it, ru, tr, ja, ko, zh, vi, bn, ar, he, ka_ge)
  helpers/               ← Utilitários gerais
```

## Arquitetura Backend (obrigatório seguir)

A camada de backend segue rigorosamente:

```
Controller >> Service >> Repository
```

Em alguns casos com manager:

```
Controller >> Manager >> Service >> Repository
```

- **Nunca** fazer shortcut entre camadas
- A lógica de negócio vive em `libraries/nestjs-libraries/src/`
- O backend (`apps/backend`) é usado principalmente para controllers e imports de libs

## Frontend

- Componentes UI reutilizáveis: `/apps/frontend/src/components/ui`
- Roteamento: `/apps/frontend/src/app`
- Componentes de feature: `/apps/frontend/src/components`
- **Sempre usar SWR** para buscar dados, com o hook `useFetch` de `/libraries/helpers/src/utils/custom.fetch.tsx`

### Regra obrigatória de SWR

Cada hook SWR deve estar em um hook separado, cumprindo `react-hooks/rules-of-hooks`. **Nunca** usar `eslint-disable-next-line`.

**Válido:**
```typescript
const useCommunity = () => {
  return useSWR....
}
```

**Inválido:**
```typescript
const useCommunity = () => {
  return {
    communities: () => useSWR<CommunitiesListResponse>("communities", getCommunities),
    providers: () => useSWR<ProvidersListResponse>("providers", getProviders),
  };
}
```

### Traducoes (obrigatorio)

Todo texto visivel ao usuario no frontend **deve** usar o hook `useT()` de `@gitroom/react/translation/get.transation.service.client`:

```typescript
const t = useT();
// t('chave_unica', 'Texto fallback em ingles')
```

- **Nunca** usar strings hardcoded em JSX — sempre passar pelo `t()`
- Ao criar novas chaves, adicionar a traducao em **pt** (`libraries/react-shared-libraries/src/translation/locales/pt/translation.json`) e **en** (`locales/en/translation.json`)
- Manter as chaves em snake_case e descritivas (ex: `select_late_profile`, `failed_to_add_channel`)
- Os demais idiomas usam o fallback em ingles automaticamente

### Tailwind e estilos

Antes de escrever qualquer componente, verificar:
- `/apps/frontend/src/app/colors.scss`
- `/apps/frontend/src/app/global.scss`
- `/apps/frontend/tailwind.config.js`

As variáveis `--color-custom*` estão **depreciadas** — não usar. Verificar outros componentes do sistema para manter consistência de design.

**Nunca instalar componentes frontend do npmjs** — escrever componentes nativos.

## Linting

O linting só pode rodar a partir da raiz do projeto:

```bash
pnpm lint
```

## Princípios de Desenvolvimento

### TDD Obrigatorio (Test-Driven Development)

Toda nova feature, bug fix ou refactor **deve** seguir o ciclo TDD:

1. **RED** — Escrever o teste `.spec.ts` primeiro com o comportamento esperado (o teste deve falhar)
2. **GREEN** — Implementar o minimo de codigo para o teste passar
3. **REFACTOR** — Melhorar o codigo mantendo os testes verdes

#### Regras

- **Nunca** commitar codigo de producao sem o `.spec.ts` correspondente
- Testes devem ser co-localizados: `foo.service.ts` → `foo.service.spec.ts` (mesmo diretorio)
- Usar sempre `.spec.ts` (nao `.test.ts`)
- Rodar `pnpm test` antes de cada commit para garantir que nada quebrou

#### Utilitarios de teste (usar sempre)

Os helpers estao em `libraries/nestjs-libraries/src/test/`:

```typescript
import { createMock, createPrismaRepositoryMock, createTestModule } from '@gitroom/nestjs-libraries/test';
```

- `createMock<T>()` — mock de qualquer classe via jest-mock-extended (sem necessidade de interfaces)
- `createPrismaRepositoryMock('tableName')` — mock de `PrismaRepository<T>` com `model.[table]` mockado
- `createTestModule({ service, mocks })` — factory para NestJS TestingModule com mocks automaticos

#### Abordagem por camada

| Camada | O que testar | Como mockar |
|---|---|---|
| **Service** | Logica de negocio, branching, delegacao | `createMock<Repository>()` ou `createTestModule()` para muitas deps |
| **Repository** | Construcao de queries, transformacao de dados | `createPrismaRepositoryMock('table')` |
| **Controller** | Camada HTTP, extracao de params | `@nestjs/testing` com service mockado |
| **Social Provider** | Formatacao de posts, auth URLs, tratamento de erros | Instanciacao direta, `jest.spyOn` para HTTP |

#### Estrutura do teste

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

#### Prioridade de cobertura

1. Services com logica de negocio (maior valor)
2. Social providers (isolados, sem DI)
3. Repositories com transformacao de dados
4. Controllers (menor prioridade — camada fina)

#### Comandos

```bash
pnpm test              # Todos os testes com coverage
pnpm test:watch        # Watch mode durante desenvolvimento
pnpm test:backend      # Apenas testes do backend
pnpm test:libs         # Apenas testes das libraries
```

#### Exemplos de referencia

- Service simples: `libraries/nestjs-libraries/src/database/prisma/sets/sets.service.spec.ts`
- Repository: `libraries/nestjs-libraries/src/database/prisma/sets/sets.repository.spec.ts`

### Document-First
Toda nova feature deve ter documentação escrita **antes ou em conjunto** com a implementação:
- Atualizar `docs/` antes de abrir PR
- PR sem documentação não deve ser mergeado

### API-First
Toda nova feature com interface de backend deve ter **contrato de API definido primeiro**:
- Definir endpoints, payloads e respostas antes de implementar
- A UI sempre consome a API, nunca o contrário
- Mudanças de contrato devem ser versionadas

### Changelog Incremental
Ao concluir uma tarefa que resulta em commit (feature, fix, refactor, etc.), **sempre atualize** a secao `## [Unreleased]` do `CHANGELOG.md` com uma entrada descritiva:
- Adicione na subcategoria correta: `### Adicionado`, `### Corrigido`, `### Alterado`, `### Removido`, `### Performance`, `### Documentacao`
- Crie a subcategoria se ela nao existir ainda dentro de `[Unreleased]`
- Escreva em portugues, sem acentos (compatibilidade de arquivos)
- Descreva o impacto para o usuario, nao o detalhe tecnico (ex: "Suporte a agendamento de Reels no Instagram" em vez de "Adicionar InstagramReelsProvider")
- Uma linha por mudanca; agrupar mudancas relacionadas do mesmo commit
- NAO incluir hash de commit (sera adicionado pelo `/changelog` na consolidacao)
- Se a mudanca for trivial (typo, ajuste interno sem impacto), nao adicionar entrada

## Estratégia Git (GitLab Flow)

### Branches

| Branch | Papel |
|---|---|
| `postiz` | Espelho limpo do upstream oficial — **nunca commitar customizações aqui** |
| `main` | Desenvolvimento e customizações do Robô MultiPost |
| `release` | Versão estável para produção — imagem Docker é gerada daqui |

### Remotes

| Remote | URL |
|---|---|
| `origin` | `https://github.com/maiconramos/robo-multipost` |
| `upstream` | `https://github.com/gitroomhq/postiz-app` |

### Regras

- Todo código customizado vai para `main`
- `release` só recebe merge de `main` quando testado e aprovado
- Releases estáveis são gerados a partir de `release`; pre-releases (RC/beta) são tags em `main`
- Toda promoção `main` → `release` deve gerar uma tag semântica (ex: `v1.2.0`)
- Features grandes: criar branch `custom/nome-da-feature` a partir de `main`
- Features pequenas: podem ir direto em `main`

### Versionamento SemVer

| Tipo | Incrementa | Exemplo |
|---|---|---|
| Update do upstream Postiz | `MINOR` | `v1.1.0` → `v1.2.0` |
| Nova feature customizada | `MINOR` | `v1.2.0` → `v1.3.0` |
| Correção de bug | `PATCH` | `v1.2.0` → `v1.2.1` |
| Breaking change | `MAJOR` | `v1.2.0` → `v2.0.0` |

## Comandos Úteis

```bash
# Desenvolvimento
pnpm dev                  # Todos os apps em paralelo
pnpm dev-backend          # Backend + frontend

# Build
pnpm build                # Build completo
pnpm build:backend
pnpm build:frontend
pnpm build:orchestrator

# Banco de dados
pnpm prisma-generate      # Gerar Prisma client
pnpm prisma-db-push       # Aplicar migrações

# Docker
pnpm docker-build         # Build das imagens Docker

# Linting (sempre da raiz)
pnpm lint
```

## Contexto Portável (.context/)

O diretório `.context/` é gerenciado pelo [dotcontext](https://github.com/dotcontext/cli) (MCP configurado em `.mcp.json` na raiz) e é a source-of-truth para portabilidade entre IDEs (Claude Code, Antigravity, Cursor, Codex). Mudanças manuais em `.claude/`, `.cursor/rules`, `.windsurfrules` ou `.github/copilot-instructions.md` **não** se propagam sem sync explícito via dotcontext.

Gateways disponíveis quando o MCP está carregado: `explore`, `context`, `plan`, `agent`, `skill`, `sync`. Como invocar:

- `use the security-auditor agent to audit the new webhook handler`
- `use the commit-message skill to draft a commit for staged changes`
- `plan "<descrição>" using dotcontext` (workflow PREVC completo)

Estado atual: 14 agents preenchidos em `.context/agents/`, 10 docs preenchidos em `.context/docs/`, e 10 skills `unfilled` em `.context/skills/` aguardando preenchimento via MCP. Para ativar o MCP localmente e preencher os skills, siga `docs/planning/dotcontext-bootstrap.md`. Para uso diário, veja `docs/planning/dotcontext-daily-usage.md`.

## Contexto de Produto

- **Idioma padrão:** pt-BR (arquivo de tradução `pt` já existe em `react-shared-libraries/src/translation/locales/`)
- **Branding:** "Robô MultiPost" (fork do Postiz, créditos mantidos por exigência da AGPL)
- **Integração Zernio:** TikTok e Pinterest via [Zernio API](https://docs.zernio.com/llms-full.txt) como provedor alternativo (ex-Late/getlate.dev — mesma empresa, nova marca)
- **Billing:** desabilitado por padrão para self-hosted (`DISABLE_BILLING=true`)
- **Marketplace:** desabilitado por padrão (`DISABLE_MARKETPLACE=true`)
- **Storage:** local por padrão, Cloudflare R2 como opção avançada
- **IA:** infraestrutura Mastra + MCP já existe — trabalho é configurar providers por workspace

## Sistema de Creditos de IA

O sistema de creditos controla quantas imagens e videos cada perfil pode gerar por mes.

### Modos de operacao (`AI_CREDITS_MODE`)

| Modo | Comportamento |
|------|--------------|
| `unlimited` (default) | Todos os perfis geram sem limite. Uso registrado para analytics |
| `managed` | Creditos gerenciados por perfil. Perfil default (admin) sempre ilimitado |

### Cadeia de precedencia (modo managed)

```
1. AI_CREDITS_MODE=unlimited → SEMPRE ilimitado, ignora tudo
2. Perfil default (isDefault=true) → sempre ilimitado
3. Config do perfil (aiImageCredits/aiVideoCredits) → se preenchido, usa
4. Config default (AI_CREDITS_DEFAULT_IMAGES/AI_CREDITS_DEFAULT_VIDEOS) → se preenchido, usa
5. Fallback → ilimitado (-1)
```

### Valores especiais nos campos de creditos

| Valor | Significado |
|-------|-------------|
| `null` | Usar padrao da env var ou fallback ilimitado |
| `-1` | Ilimitado para este perfil |
| `0` | Bloqueado (sem creditos de IA) |
| `N > 0` | N creditos por mes |

### Env vars relacionadas

```env
AI_CREDITS_MODE="unlimited"        # "unlimited" ou "managed"
# AI_CREDITS_DEFAULT_IMAGES=50     # default para novos perfis (modo managed)
# AI_CREDITS_DEFAULT_VIDEOS=10     # default para novos perfis (modo managed)
```

### Endpoints REST

```
GET  /copilot/credits?type=ai_images|ai_videos  → { credits: number }
GET  /settings/profiles/:id/ai-credits          → config + uso do perfil (ADMIN)
PUT  /settings/profiles/:id/ai-credits          → atualiza config (ADMIN, nao edita default)
GET  /settings/ai-credits/summary               → lista perfis com creditos e uso (ADMIN)
```

### Arquivos principais

- **Service:** `libraries/nestjs-libraries/src/database/prisma/subscriptions/subscription.service.ts`
- **Repository:** `libraries/nestjs-libraries/src/database/prisma/subscriptions/subscription.repository.ts`
- **Schema:** `schema.prisma` → campos `aiImageCredits`/`aiVideoCredits` em Profile, `profileId` em Credits
- **Frontend settings:** `apps/frontend/src/components/settings/ai-credits.settings.component.tsx`
- **Frontend badges:** `apps/frontend/src/components/launches/ai.image.tsx`, `ai.video.tsx`
- **Testes:** `__tests__/subscription.service.spec.ts`, `subscription.repository.spec.ts`

## Automacoes Instagram (follow gate, DMs, webhooks)

Subsistema crítico — antes de mexer, ler:

- **Referência de agente:** `docs/architecture/instagram-automations.md`
  (mapa de arquivos, camadas de credenciais, roteamento de tokens,
  follow-gate 2 etapas, armadilhas).
- **Guia de usuário:** `docs/automacoes-instagram.md`.

### Regras de ouro

1. **Três camadas de credenciais Meta** (nunca misturar):
   - Credenciais do App (workspace) — `Credentials.clientId/clientSecret`,
     `instagramAppId/instagramAppSecret`, `threadsAppId/threadsAppSecret`.
     Usadas em OAuth e validação HMAC.
   - Token da Integration — `Integration.token` é Page Access Token
     (providerIdentifier=`instagram`) OU IG User Token
     (providerIdentifier=`instagram-standalone`).
   - Messaging Tokens (cadastrados em Settings > Credenciais > Instagram)
     — Meta System User Token + IG User Tokens por conta, em
     `Credentials.metaSystemUserToken` / `Credentials.instagramTokens`.

2. **Decisão única de host/token** para activities de comentário:
   `FlowActivity.resolveIgRoute(integration)` em
   `apps/orchestrator/src/activities/flow.activity.ts`.
   Prioridade: standalone → IG User Token cadastrado → Page Access Token.

3. **Propagação de `ClientInformation`** é obrigatória em providers OAuth
   — veja `memory/feedback_per_profile_credentials.md`.

4. **Follow-gate em `comment_on_post`** usa fluxo de 2 etapas com
   `PendingPostback` + botão postback. `sendPrivateReply` só pode ser
   usado UMA vez por comentário. Workflow:
   `flow.execution.workflow.ts` cria o pending,
   `follow-gate-resolve.workflow.ts` resolve quando o clique chega.

5. **HMAC do webhook IG** deve ser validado com `FACEBOOK_APP_SECRET` E
   `INSTAGRAM_APP_SECRET` (quando ambos os produtos estão no mesmo app
   Meta). Ver `ig-webhook.controller.ts`.

## Persona de IA e Knowledge Base por Perfil

Cada perfil pode ter:

- **Persona** (texto): tom de voz, publico-alvo, CTAs preferidos, restricoes,
  estilo de imagem. Injetada automaticamente no agente Mastra, no Generator
  LangGraph e nos prompts DALL-E. Ver `docs/architecture/profile-ai-persona.md`.
- **Knowledge Base** (RAG vetorial): upload de PDF/TXT/MD, chunking + embeddings,
  consultado pela tool `knowledgeBaseQuery` antes do agente gerar fatos
  especificos. Requer `pgvector/pgvector:pg17`. Ver
  `docs/architecture/knowledge-base-rag.md`.

Feature flag: `ENABLE_KNOWLEDGE_BASE` (default `true`).

## Sistema de Provedores de IA (AI Provider)

Subsistema central — antes de mexer em qualquer feature de IA, ler:

- **Referência de agente:** `docs/architecture/ai-provider-system.md`
  (mapa completo: schema, services, cadeia de resolução, endpoints REST,
  UI Settings, geração de imagem, como adicionar provider novo, troubleshooting).

### Regras de ouro

1. **Configuração é per-workspace via UI**, não via env var. O admin
   acessa Settings > AI Provider e configura cada `kind` (TEXT, IMAGE,
   VIDEO, WEB_SEARCH) com provider (OpenRouter ou OpenAI direto), API
   key, modelo, fallback e opções. Chave armazenada com AES-256-GCM
   (mesma `ENCRYPTION_KEY` do OAuth).

2. **Cadeia de resolução** sempre passa pelo `AiProviderResolverService`:
   `PROFILE → WORKSPACE com shareDefault → HTTP 412`. Nunca acesse
   credenciais de IA pulando o resolver.

3. **Para adicionar consumer novo**, usar a `AiClientFactory`:
   - Texto: `factory.text(orgId, profileId)` → `LanguageModel` AI SDK v5
   - Imagem: `AiImageService.generate(orgId, prompt, profileId)` →
     base64 (fetch direto, não via AI SDK por causa de incompatibilidades)
   - Mastra Agent: `factory.textForMastra(orgId, profileId)` retorna
     função async lazy — modelo é resolvido a cada chamada, sem
     reiniciar o Agent.

4. **Erro 412 Precondition Failed** é o status semântico para
   "credencial não configurada". **Não use 402** — é interceptado pelo
   layout.context global do Postiz para abrir modal de billing.

5. **Per-profile override**: perfil default (`isDefault=true`) edita
   workspace. Perfil secundário pode criar override em scope=PROFILE
   sem afetar o default. Detectado via `useCurrentProfile()` hook.

### Comandos úteis

```bash
# Testar specs do sistema de IA (56 specs)
pnpm jest libraries/nestjs-libraries/src/ai/ --no-coverage

# Limpar cache do catálogo de modelos OpenRouter
curl -X POST -H "Cookie: ..." http://localhost:3000/ai/catalog/refresh
```

## Serviços Obrigatórios em Produção

O produto requer 5 serviços rodando:
1. App (backend + frontend)
2. PostgreSQL 17
3. Redis 7
4. **Temporal** (orquestrador de workflows — crítico para agendamento)
5. Nginx (reverse proxy)
