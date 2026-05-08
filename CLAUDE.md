# Robô MultiPost — Claude Code Instructions

## Identity

**Robô MultiPost** is a fork of [Postiz](https://github.com/gitroomhq/postiz-app) (AGPL-3.0), customized for the Automação Sem Limites community. Self-hosted social media scheduler with 33+ channels, calendar-based scheduling, analytics, media library, and a per-workspace AI layer.

## Stack

| Layer | Technology | Details in |
|---|---|---|
| Backend | NestJS + TypeScript | [`apps/backend/CLAUDE.md`](apps/backend/CLAUDE.md) |
| Frontend | Next.js 14 + React 18 + Tailwind 3 | [`apps/frontend/CLAUDE.md`](apps/frontend/CLAUDE.md) |
| Orchestrator | NestJS + Temporal.io | [`apps/orchestrator/CLAUDE.md`](apps/orchestrator/CLAUDE.md) |
| Shared domain | NestJS libraries | [`libraries/nestjs-libraries/CLAUDE.md`](libraries/nestjs-libraries/CLAUDE.md) |
| Shared UI | React libraries | [`libraries/react-shared-libraries/CLAUDE.md`](libraries/react-shared-libraries/CLAUDE.md) |
| ORM | Prisma + PostgreSQL 17 | — |
| Package manager | **PNPM** (monorepo) — never npm/yarn | — |
| AI | Mastra + MCP | [`libraries/nestjs-libraries/src/ai/CLAUDE.md`](libraries/nestjs-libraries/src/ai/CLAUDE.md) |

## Monorepo Map

| Path | Purpose | Child CLAUDE.md |
|---|---|---|
| `apps/backend/` | REST API | [link](apps/backend/CLAUDE.md) |
| `apps/frontend/` | Next.js UI | [link](apps/frontend/CLAUDE.md) |
| `apps/orchestrator/` | Temporal workflows | [link](apps/orchestrator/CLAUDE.md) |
| `apps/extension/` | Browser extension | — (stub) |
| `apps/cli/` | `postiz` CLI | — (stub) |
| `apps/sdk/` | `@postiz/node` SDK | — (stub) |
| `apps/commands/` | Background commands microservice | — (stub) |
| `libraries/nestjs-libraries/` | Shared backend/orchestrator domain | [link](libraries/nestjs-libraries/CLAUDE.md) |
| `└── src/integrations/social/` | 40+ social media providers | [link](libraries/nestjs-libraries/src/integrations/social/CLAUDE.md) |
| `└── src/ai/` | AI Provider System, credits, persona, KB | [link](libraries/nestjs-libraries/src/ai/CLAUDE.md) |
| `└── src/chat/` | Mastra agents, MCP tools, IG webhook | [link](libraries/nestjs-libraries/src/chat/CLAUDE.md) |
| `└── src/database/prisma/` | Schema + repositories | inside parent |
| `libraries/react-shared-libraries/` | Shared UI components | [link](libraries/react-shared-libraries/CLAUDE.md) |
| `libraries/helpers/` | General utilities | inside root |
| `docs/` | Architecture and operations (read, don't rewrite) | — |
| `.context/` | Portable dotcontext via MCP — DO NOT touch | — |

## Non-Negotiable Principles

1. **Controller → Service → Repository** with no shortcut between layers. Business logic lives in `libraries/nestjs-libraries/src/`. Details in [`apps/backend/CLAUDE.md`](apps/backend/CLAUDE.md).
2. **TDD is mandatory** (RED → GREEN → REFACTOR). Specs are co-located, suffix `.spec.ts`. Helpers and patterns in [`libraries/nestjs-libraries/CLAUDE.md`](libraries/nestjs-libraries/CLAUDE.md).
3. **PNPM only** — `npm`/`yarn` are blocked.
4. **i18n is mandatory in the frontend** — no hardcoded strings in JSX, always `useT()`. Details in [`apps/frontend/CLAUDE.md`](apps/frontend/CLAUDE.md).
5. **Document-First** — update `docs/` before or alongside the PR; PRs without documentation are not merged.
6. **API-First** — define the contract (endpoint + payload + response) before implementing. UI consumes the API, never the other way around.
7. **Incremental Changelog** — every non-trivial commit updates `## [Unreleased]` in `CHANGELOG.md` (entries in pt-BR with full accents, Keep a Changelog format).
8. **GitLab Flow** — branches `postiz` (upstream mirror, never commit here) | `main` (development) | `release` (production). Promoting `main → release` requires a SemVer tag.

## Golden Rules

- **Never** use `eslint-disable-next-line` — refactor to comply with the rule.
- **Never** install UI components from npm — write them natively (see [`apps/frontend/CLAUDE.md`](apps/frontend/CLAUDE.md)).
- **Never** access AI credentials skipping `AiProviderResolverService` (see [`libraries/nestjs-libraries/src/ai/CLAUDE.md`](libraries/nestjs-libraries/src/ai/CLAUDE.md)).
- **Never** hardcode `graph.facebook.com` in Instagram comment activities — use `FlowActivity.resolveIgRoute` (see [`apps/orchestrator/CLAUDE.md`](apps/orchestrator/CLAUDE.md)).
- **Never** hardcode `process.env` in OAuth providers — propagate `ClientInformation` (see [`libraries/nestjs-libraries/src/integrations/social/CLAUDE.md`](libraries/nestjs-libraries/src/integrations/social/CLAUDE.md)).
- **Never** touch `.context/` — managed by dotcontext via MCP, has its own lifecycle.
- Linting runs **only from the repo root** with `pnpm lint`.
- Project skills live in `.claude/skills/`; per-session auto-memory in `~/.claude/projects/.../memory/`.

## Product Context

- **Default language:** pt-BR (`react-shared-libraries/src/translation/locales/pt`). User-facing text uses full pt-BR accents.
- **Branding:** "Robô MultiPost" — Postiz credits preserved as required by AGPL.
- **Zernio (formerly Late / getlate.dev):** TikTok and Pinterest via [Zernio API](https://docs.zernio.com/llms-full.txt) as alternative provider. Details in [`libraries/nestjs-libraries/src/integrations/social/CLAUDE.md`](libraries/nestjs-libraries/src/integrations/social/CLAUDE.md).
- **Billing:** disabled by default (`DISABLE_BILLING=true`).
- **Marketplace:** disabled by default (`DISABLE_MARKETPLACE=true`).
- **Storage:** local by default; Cloudflare R2 optional.
- **AI:** Mastra + MCP infra exists; configuration is per-workspace via Settings UI.

## Required Production Services

App (backend + frontend) | PostgreSQL 17 | Redis 7 | **Temporal** (critical for scheduling) | Nginx (reverse proxy).

## Essential Commands

```bash
# Development
pnpm dev                  # All apps
pnpm dev-backend          # Backend + frontend

# Build
pnpm build                # Full build
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

# Quality
pnpm lint                 # Always from repo root
pnpm test                 # Full coverage

# Docker
pnpm docker-build
```

Area-specific commands (AI tests, catalog refresh, release scripts) live in the respective child `CLAUDE.md` files.

## Note on Language

This `CLAUDE.md` and all child `CLAUDE.md` files are written in **English** (better for AI agents). User-facing artifacts — `CHANGELOG.md`, `docs/`, translation files in `pt/translation.json`, UI strings via `useT()` — remain in pt-BR per project convention.

## References

- [`AGENTS.md`](AGENTS.md) — points to this file (single source of truth).
- [`docs/architecture/`](docs/architecture/) — detailed architecture (AI Provider, Instagram automations, AI persona, knowledge base).
- [`docs/planning/`](docs/planning/) — feature planning and PRDs.
- [`docs/operations/`](docs/operations/) — Docker release, deploy.
- [`CHANGELOG.md`](CHANGELOG.md) — change history.
- `.context/` — portable dotcontext (MCP, do not touch).
