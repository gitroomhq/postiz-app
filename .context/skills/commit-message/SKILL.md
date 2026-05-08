---
type: skill
name: Commit Message
description: Draft a commit message for staged changes following Robô MultiPost's Conventional Commits convention — pt-BR sem acentos, scope detectado por área tocada, subject imperativo curto. Use after `git add` and before `git commit`, or to rewrite a poorly-named commit.
skillSlug: commit-message
phases: [E, C]
generated: 2026-02-20
status: filled
scaffoldVersion: "2.0.0"
---

## Format

```
type(scope): subject

[optional body]
```

- Subject: **pt-BR sem acentos**, minúsculo, modo imperativo presente, ≤72 chars (target 50–60).
- Body: only when the *why* is non-obvious — link incidents, RFCs, or constraints. Wrap at 72 chars. Skip for routine changes.
- One commit = one logical change. Two unrelated areas → two commits.

## Type taxonomy (canonical, observed in `git log`)

| Type | Use for |
|---|---|
| `feat` | new user-visible feature or new capability in a module |
| `fix` | bug fix, regression repair |
| `chore` | tooling, deps, configs, internal refactor without behavior change |
| `docs` | documentation only (`docs/`, `CHANGELOG.md`, `CLAUDE.md`, READMEs) |
| `refactor` | code restructuring without behavior change (use `chore` if mostly config/tooling) |
| `test` | spec-only changes (rare here — usually bundled in `feat`/`fix` per TDD) |
| `perf` | performance improvement |

## Scope detection by path

Pick the **innermost** scope that captures the change. If two scopes apply, pick the one with the larger blast radius.

| Touched files | Scope |
|---|---|
| `libraries/nestjs-libraries/src/ai/ai-text*` | `ai-text` |
| `libraries/nestjs-libraries/src/ai/ai-image*` | `ai-image` |
| `libraries/nestjs-libraries/src/ai/ai-video*` | `ai-video` |
| `libraries/nestjs-libraries/src/ai/ai-web-search*` | `ai-search` |
| `libraries/nestjs-libraries/src/ai/ai-credential*` / `ai-provider-resolver*` | `ai-provider` |
| `libraries/nestjs-libraries/src/ai/ai-catalog*` | `ai-catalog` |
| `libraries/nestjs-libraries/src/ai/*` (cross-cutting) | `ai` |
| `libraries/nestjs-libraries/src/integrations/social/<provider>.provider.ts` | `<provider>` (e.g., `instagram`, `linkedin`, `tiktok`) |
| `libraries/nestjs-libraries/src/integrations/social/*` (cross-cutting) | `integrations` |
| `apps/orchestrator/src/activities/repost*` | `repost` |
| `apps/orchestrator/src/workflows/flow*` | `flow` |
| `libraries/nestjs-libraries/src/chat/*` (Mastra agent, MCP) | `agent` |
| `apps/frontend/src/components/launches/*` | `composer` (post composer) |
| `apps/frontend/src/components/automations/*` | `automacoes` |
| `apps/frontend/src/components/settings/ai-provider/*` | `ai-provider` |
| `libraries/react-shared-libraries/src/translation/locales/*` | `i18n` |
| `libraries/nestjs-libraries/src/database/prisma/schema.prisma` | `db` |
| `CHANGELOG.md` only | `docs(changelog)` |
| `docs/architecture/*` | `docs(arch)` |
| `docs/operations/*` | `docs(ops)` |
| `docs/planning/*` | `docs(planning)` |
| `CLAUDE.md` (any) / `AGENTS.md` / `.claude/*` | `claude-md` |
| `.context/*` (dotcontext) | `dotcontext` |
| `.env.example` / Dockerfile / `package.json` deps / CI | `env` or `chore(deps)` / `chore(ci)` |

If genuinely cross-cutting (3+ unrelated scopes), drop the scope: `feat: …`.

## Subject style

- **Imperative present, third-person form, no accents.** Examples from real history: `geracao de video via Kie.ai`, `preenche skill code-review`, `traduz placeholder do input`, `adiciona AGENTS.md raiz`, `configura MCP server via .mcp.json`.
- **No accents** even in pt-BR words: `geracao` not `geração`, `traducoes` not `traduções`, `automacoes` not `automações`. (Override of normal pt-BR — see `feedback_changelog_accents` memory.)
- **No trailing period.**
- Combine related sub-changes with `+`: `fix(ai-video): erros do kie.ai traduzidos + isReasoningModel cobre gpt-5.5`.
- Capitalize only proper nouns (Kie.ai, OpenRouter, Mastra, Temporal); first word lowercase.

## Body when needed

Use the body to capture *why*, not *what*:

- The bug it fixes (link issue if present).
- The constraint that drove the design (perf budget, AGPL clause, upstream merge requirement).
- Breaking changes — start the body with `BREAKING CHANGE:` and explain the migration.

Skip the body for:
- One-line config tweaks.
- Doc updates.
- Test-only changes that come with the spec name.

## Pre-commit checklist

Before staging the message, verify:

1. `git status` — only intended files staged. Reject `.env`, credentials, `node_modules`.
2. `git diff --staged` — nothing left from a debugging session (`console.log`, commented code).
3. `pnpm lint` passes from repo root.
4. If touched code under `*.service.ts` / `*.repository.ts` / `*.provider.ts` / `*.factory.ts`, the matching `*.spec.ts` is in the same commit (TDD hook in `.claude/hooks/tdd-check.sh` may block otherwise).
5. If user-visible behavior changed, add a line under `## [Unreleased]` in `CHANGELOG.md` (pt-BR sem acentos, Keep a Changelog sections).

## Examples (taken from this repo's history)

```
feat(ai): geracao de video via Kie.ai (Seedance 2.0 + Veo 3.1) + Bloco 2.2
fix(ai-video): upload local de imagem I2V + ajustes de copy
fix(ai-provider): heranca respeita shareDefault + textos referem ao perfil default
fix(ai-catalog): bypass cache Redis para catalogos estaticos + label "Modelo"
fix(i18n): traduz placeholder do input do Agente de IA
chore(dotcontext): preenche skill test-generation
chore(claude-md): adiciona apps/backend/CLAUDE.md
docs(changelog): registra reorganizacao do CLAUDE.md em hierarquia
chore(env): OPENAI_API_KEY e Tavily nao sao mais obrigatorios
```

## Anti-patterns

- `update X` / `fix bug` / `WIP` / `misc changes` — too vague; rewrite.
- English subjects when the codebase trends pt-BR — match the surrounding history.
- Mixing scopes (`feat(ai+frontend): ...`) — split the commit.
- Subjects with full pt-BR accents (`fix: corrige geração de imagem`) — drop to `geracao`.
- Trailers like `Generated with Claude` / `Co-Authored-By: Claude`. The repo's history is clean Conventional Commits without these — do not introduce them.
- `--amend` on a published commit — create a new commit instead (per `CLAUDE.md` Git Safety Protocol).

## Quick generate flow

When asked to "draft a commit":

1. Run `git diff --staged --stat` to map files → scope.
2. Read `git diff --staged` for the actual change to decide *type* (`feat` vs `fix` vs `chore`).
3. Write subject in the format above; check ≤72 chars.
4. Decide body necessity (skip if obvious from subject + diff).
5. Show the user the proposed message before invoking `git commit`.
