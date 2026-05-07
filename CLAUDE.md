# Robô MultiPost — Instruções para Claude Code

## Identidade

**Robô MultiPost** é um fork do [Postiz](https://github.com/gitroomhq/postiz-app) (AGPL-3.0), adaptado para a comunidade Automação Sem Limites. Scheduler self-hosted de redes sociais com 33+ canais, agendamento via calendário, analytics, biblioteca de mídia e camada de IA por workspace.

## Stack Principal

| Camada | Tecnologia | Detalhes em |
|---|---|---|
| Backend | NestJS + TypeScript | [`apps/backend/CLAUDE.md`](apps/backend/CLAUDE.md) |
| Frontend | Next.js 14 + React 18 + Tailwind 3 | [`apps/frontend/CLAUDE.md`](apps/frontend/CLAUDE.md) |
| Orchestrator | NestJS + Temporal.io | [`apps/orchestrator/CLAUDE.md`](apps/orchestrator/CLAUDE.md) |
| Domínio compartilhado | NestJS libraries | [`libraries/nestjs-libraries/CLAUDE.md`](libraries/nestjs-libraries/CLAUDE.md) |
| UI compartilhada | React libraries | [`libraries/react-shared-libraries/CLAUDE.md`](libraries/react-shared-libraries/CLAUDE.md) |
| ORM | Prisma + PostgreSQL 17 | — |
| Package manager | **PNPM** (monorepo) — nunca npm/yarn | — |
| IA | Mastra + MCP | [`libraries/nestjs-libraries/src/ai/CLAUDE.md`](libraries/nestjs-libraries/src/ai/CLAUDE.md) |

## Mapa do Monorepo

| Caminho | Finalidade | CLAUDE.md filho |
|---|---|---|
| `apps/backend/` | API REST | [link](apps/backend/CLAUDE.md) |
| `apps/frontend/` | UI Next.js | [link](apps/frontend/CLAUDE.md) |
| `apps/orchestrator/` | Workflows Temporal | [link](apps/orchestrator/CLAUDE.md) |
| `apps/extension/` | Browser extension | — (stub) |
| `apps/cli/` | CLI `postiz` | — (stub) |
| `apps/sdk/` | SDK `@postiz/node` | — (stub) |
| `apps/commands/` | Microserviço de comandos background | — (stub) |
| `libraries/nestjs-libraries/` | Domínio compartilhado backend/orchestrator | [link](libraries/nestjs-libraries/CLAUDE.md) |
| `└── src/integrations/social/` | 40+ providers de redes sociais | [link](libraries/nestjs-libraries/src/integrations/social/CLAUDE.md) |
| `└── src/ai/` | AI Provider System, créditos, persona, KB | [link](libraries/nestjs-libraries/src/ai/CLAUDE.md) |
| `└── src/chat/` | Mastra agents, MCP tools, webhook IG | [link](libraries/nestjs-libraries/src/chat/CLAUDE.md) |
| `└── src/database/prisma/` | Schema + repositories | dentro do parent |
| `libraries/react-shared-libraries/` | Componentes UI compartilhados | [link](libraries/react-shared-libraries/CLAUDE.md) |
| `libraries/helpers/` | Utilitários gerais | dentro do root |
| `docs/` | Arquitetura e operações (ler, não reescrever) | — |
| `.context/` | Contexto portável (dotcontext via MCP — não tocar) | — |

## Princípios Não-Negociáveis

1. **Controller → Service → Repository** sem shortcut entre camadas. Lógica de negócio em `libraries/nestjs-libraries/src/`. Detalhes em [`apps/backend/CLAUDE.md`](apps/backend/CLAUDE.md).
2. **TDD obrigatório** (RED → GREEN → REFACTOR). Specs co-localizados, sufixo `.spec.ts`. Helpers e padrões em [`libraries/nestjs-libraries/CLAUDE.md`](libraries/nestjs-libraries/CLAUDE.md).
3. **PNPM only** — `npm`/`yarn` bloqueados.
4. **i18n obrigatório no frontend** — sem string hardcoded em JSX, sempre `useT()`. Detalhes em [`apps/frontend/CLAUDE.md`](apps/frontend/CLAUDE.md).
5. **Document-First** — atualizar `docs/` antes ou junto do PR; PR sem documentação não é mergeado.
6. **API-First** — contrato (endpoint + payload + response) definido antes da implementação. UI consome API, nunca o contrário.
7. **Changelog Incremental** — cada commit não-trivial atualiza `## [Unreleased]` em `CHANGELOG.md` (entradas em pt-BR com acentos completos, formato Keep a Changelog).
8. **GitLab Flow** — branches `postiz` (mirror upstream, nunca commitar) | `main` (dev) | `release` (produção). Promoção `main → release` exige tag SemVer.

## Golden Rules

- **Nunca** usar `eslint-disable-next-line` — refatorar para cumprir a regra.
- **Nunca** instalar componente UI do npm — escrever nativo (ver [`apps/frontend/CLAUDE.md`](apps/frontend/CLAUDE.md)).
- **Nunca** acessar credenciais de IA pulando o `AiProviderResolverService` (ver [`libraries/nestjs-libraries/src/ai/CLAUDE.md`](libraries/nestjs-libraries/src/ai/CLAUDE.md)).
- **Nunca** hardcodar `graph.facebook.com` em activities de comentário Instagram — usar `FlowActivity.resolveIgRoute` (ver [`apps/orchestrator/CLAUDE.md`](apps/orchestrator/CLAUDE.md)).
- **Nunca** hardcodar `process.env` em providers OAuth — propagar `ClientInformation` (ver [`libraries/nestjs-libraries/src/integrations/social/CLAUDE.md`](libraries/nestjs-libraries/src/integrations/social/CLAUDE.md)).
- **Nunca** mexer em `.context/` — gerenciado pelo dotcontext via MCP, ciclo de vida próprio.
- Linting roda **só da raiz** com `pnpm lint`.
- Skills internas em `.claude/skills/`; auto-memory por sessão em `~/.claude/projects/.../memory/`.

## Contexto de Produto

- **Idioma padrão:** pt-BR (`react-shared-libraries/src/translation/locales/pt`)
- **Branding:** "Robô MultiPost" — créditos do Postiz mantidos por exigência da AGPL
- **Zernio (ex-Late/getlate.dev):** TikTok e Pinterest via [Zernio API](https://docs.zernio.com/llms-full.txt) como provedor alternativo. Detalhes em [`libraries/nestjs-libraries/src/integrations/social/CLAUDE.md`](libraries/nestjs-libraries/src/integrations/social/CLAUDE.md).
- **Billing:** desabilitado por padrão (`DISABLE_BILLING=true`)
- **Marketplace:** desabilitado por padrão (`DISABLE_MARKETPLACE=true`)
- **Storage:** local por padrão; Cloudflare R2 opcional
- **IA:** infra Mastra + MCP existe; configuração é per-workspace via UI Settings

## Serviços Obrigatórios em Produção

App (backend + frontend) | PostgreSQL 17 | Redis 7 | **Temporal** (crítico para agendamento) | Nginx (reverse proxy).

## Comandos Essenciais

```bash
# Desenvolvimento
pnpm dev                  # Todos os apps
pnpm dev-backend          # Backend + frontend

# Build
pnpm build                # Build completo
pnpm build:backend
pnpm build:frontend
pnpm build:orchestrator

# Banco
pnpm prisma-generate
pnpm prisma-db-push

# Qualidade
pnpm lint                 # Sempre da raiz
pnpm test                 # Coverage completo

# Docker
pnpm docker-build
```

Comandos específicos por área (testes de IA, refresh de catálogo, scripts de release) ficam nos respectivos `CLAUDE.md` filhos.

## Referências

- [`AGENTS.md`](AGENTS.md) — aponta para este arquivo (single source of truth).
- [`docs/architecture/`](docs/architecture/) — arquitetura detalhada (AI Provider, Instagram automations, persona de IA, knowledge base).
- [`docs/planning/`](docs/planning/) — planejamento de features e PRDs.
- [`docs/operations/`](docs/operations/) — Docker release, deploy.
- [`CHANGELOG.md`](CHANGELOG.md) — histórico de mudanças.
- `.context/` — contexto portável dotcontext (MCP, não tocar).
