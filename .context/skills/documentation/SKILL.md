---
type: skill
name: Documentation
description: Write or update technical documentation in the right place — CLAUDE.md hierarchy, docs/architecture, docs/operations, docs/planning, .context/docs, CHANGELOG.md. Apply Document-First (write/update docs alongside the change, never after). Use when starting a non-trivial feature, before opening a PR, or when docs drift is reported.
skillSlug: documentation
phases: [P, C]
generated: 2026-02-20
status: filled
scaffoldVersion: "2.0.0"
---

## Pick the right home (this is the hardest part)

| Audience and lifecycle | Home | Language |
|---|---|---|
| Claude Code instructions per area (stack, golden rules, links) | `CLAUDE.md` (raiz) and `<area>/CLAUDE.md` | English |
| Portable agent context for any IDE | `.context/docs/`, `.context/agents/`, `.context/skills/` (via dotcontext MCP only) | English |
| Architecture deep-dive for humans | `docs/architecture/<feature>.md` | pt-BR |
| Operational runbooks (deploy, release, sync) | `docs/operations/<topic>.md` | pt-BR |
| Feature planning and PRDs | `docs/planning/<feature>.md` | pt-BR |
| Release notes for users | `CHANGELOG.md` `## [Unreleased]` | pt-BR sem acentos |
| API contract for external consumers | Swagger via `@ApiOperation` / `@ApiResponse` | English (per OpenAPI convention) |
| User-facing translations | `libraries/react-shared-libraries/src/translation/locales/{pt,en}/translation.json` | pt with full accents, en |

When in doubt: if the audience is a future engineer touching this code, it goes in `docs/` or `CLAUDE.md`. If it's an end-user or upgrader, it goes in `CHANGELOG.md`.

## Document-First discipline (non-negotiable)

- Update or create the relevant doc in the **same PR** as the code. PRs without doc updates are rejected.
- For new features: draft the architecture doc *before* writing code. The doc forces you to commit to a contract; the code becomes the implementation of the doc.
- For bug fixes: the failing spec is the test-level doc; the CHANGELOG entry is the user-level doc; the commit message is the engineering-level doc.
- Drift is the enemy: when behavior changes, the doc that described the old behavior becomes wrong. Update or delete it.

## Style guide per home

### `CLAUDE.md` files

- English. Concise, instruction-form, golden rules.
- Each child `CLAUDE.md` covers one area (e.g., `apps/backend/CLAUDE.md`); the raiz only points to the children + project-wide non-negotiables.
- Keep <300 lines per file. Move details to `docs/architecture/`. Cross-link.
- Use Markdown tables for matrices (paths → scope, env var → consequence).

### `docs/architecture/<feature>.md`

- pt-BR with full accents. Detailed, narrative, includes ASCII diagrams when useful.
- Required sections: visão geral do fluxo, schema, services, endpoints, UI, "como adicionar X", erros e fallbacks, env vars, cobertura de testes, pendências futuras, pontos de entrada para mudanças comuns.
- Reference real file paths (`libraries/nestjs-libraries/src/...`) so the doc stays grep-able when files move.

### `docs/operations/<topic>.md`

- pt-BR. Step-by-step runbooks for deploy, release, upstream sync, incident response.
- Each step has: pre-condition, command, expected output, rollback path.
- Treat as living: when a step changes, update immediately.

### `docs/planning/<feature>.md`

- pt-BR. PRD-style: contexto, objetivo, escopo, fora do escopo, plano por fase, definition of done, riscos, antipadrões.
- One file per planned feature; archive (don't delete) when shipped — moves to `docs/planning/done/` if the team decides.

### `CHANGELOG.md` `## [Unreleased]`

- pt-BR **sem acentos** (override of normal pt-BR — see `feedback_changelog_accents` memory).
- Keep a Changelog sections: `### Adicionado`, `### Alterado`, `### Corrigido`, `### Removido`, `### Documentação`.
- One bullet per user-visible change. Mention the env var, endpoint, screen, or breaking impact.
- Don't paste commit subjects — those are engineering; CHANGELOG is for end-users and upgraders.

### `.context/docs/` and `.context/skills/` and `.context/agents/`

- Edited only via the dotcontext MCP gateways (`context.fill`, `skill.fill`, etc.).
- Never hand-edit; for refresh, use `context.check` then `fill`.
- Source-of-truth for portability between Claude Code, Antigravity, Cursor, Codex.

## Translations workflow

When adding user-visible text in the frontend:

1. Add the key to `libraries/react-shared-libraries/src/translation/locales/pt/translation.json` (pt-BR with full accents — UI text is NOT the CHANGELOG override).
2. Add the same key to `en/translation.json` with the English equivalent.
3. Use `useT()` in JSX: `const t = useT(); t('settings.ai_provider.title')`.
4. Reject hardcoded strings in JSX during review.

## Anti-patterns

- Writing docs in a different PR than the code change ("docs come later") — rejected.
- Pasting raw commit messages into `CHANGELOG.md` — rewrite for end-user audience.
- Mixing accents in the same paragraph (`geração` and `geracao`) — pick the convention for the home (UI translations use accents; CHANGELOG does not).
- Long English text in `docs/architecture/` — that home is pt-BR.
- Creating yet another root file (`SETUP.md`, `GUIDE.md`, `CONTRIBUTING.md` content not already in `CLAUDE.md`) — extend the existing CLAUDE.md or `docs/operations/` instead.
- `.context/` hand-edits without dotcontext MCP — drift between IDEs.

## Quick prompts when invoking the skill

- "Document this AI Provider tab change" → write the user-visible bullet for `CHANGELOG.md` first, then update `docs/architecture/ai-provider-system.md` if a contract changed.
- "Write the runbook for the `release` promotion" → produce `docs/operations/release.md` (or update existing) with step-by-step commands.
- "Plan the new Persona feature" → draft `docs/planning/persona.md` with PRD sections, then derive the engineering tasks (use `feature-breakdown` skill).

## Canonical references

- `CLAUDE.md` (raiz) — instruction hierarchy and the "Document-First" non-negotiable.
- `docs/architecture/ai-provider-system.md` — gold standard for architecture docs in this repo.
- `docs/architecture/instagram-automations.md` — reference layout for cross-cutting subsystems.
- `CHANGELOG.md` — current accepted entry style for `[Unreleased]`.
- `changelog` skill — for consolidating `[Unreleased]` before a release.
