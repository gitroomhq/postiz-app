# Copilot Coding Agent Instructions for Robô MultiPost

Single source of truth: **[`CLAUDE.md`](../CLAUDE.md)** at the repo root, with
per-area children (`apps/backend`, `apps/frontend`, `apps/orchestrator`,
`libraries/nestjs-libraries` and children `ai/`, `chat/`, `integrations/social/`,
`libraries/react-shared-libraries`).

Before suggesting any code:

1. Read the root `CLAUDE.md` — non-negotiable principles and monorepo map.
2. Read the closest `CLAUDE.md` to the directory you are editing (cascade).
3. Check [`docs/`](../docs/) for detailed architecture (AI Provider System,
   Instagram automations, AI persona, knowledge base, etc.) — the CLAUDE.md
   files cross-reference these by link.

Key rules (non-exhaustive; see `CLAUDE.md` for the full set):

- **PNPM only** — never suggest `npm` or `yarn`.
- **Controller → Service → Repository** with no shortcut between layers.
- **TDD is mandatory**: spec first (`.spec.ts`), then implementation.
- No `eslint-disable-next-line`, no UI components from npm, no hardcoded
  strings in JSX (always `useT()`).
- **`AGENTS.md`** at the root points to `CLAUDE.md` as single source of truth.

Sentry frontend setup lives in
[`apps/frontend/CLAUDE.md`](../apps/frontend/CLAUDE.md). Sentry backend
setup lives in [`apps/backend/CLAUDE.md`](../apps/backend/CLAUDE.md).
Zernio (formerly Late, same company rebranded) details live in
[`libraries/nestjs-libraries/src/integrations/social/CLAUDE.md`](../libraries/nestjs-libraries/src/integrations/social/CLAUDE.md).

All `CLAUDE.md` files are written in English. CHANGELOG and product docs in pt-BR.
