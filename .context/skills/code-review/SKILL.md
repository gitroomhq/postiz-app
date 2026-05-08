---
type: skill
name: Code Review
description: Review a PR or diff against Robô MultiPost standards — layer pattern, TDD, i18n, AI/OAuth provider contracts, AGPL compliance, and pt-BR conventions. Use when reviewing your own staged changes before commit, reading a teammate's PR, or auditing a refactor for regressions.
skillSlug: code-review
phases: [R, V]
generated: 2026-02-20
status: filled
scaffoldVersion: "2.0.0"
---

Walk the diff top-to-bottom and check each dimension below. Block the PR on any **Must** failure; flag **Should** as comments; treat **Smell** as conversation starters. Cite file:line when reporting.

## 1. Architecture and layering (Must)

- Backend touches in `apps/backend/src/api/routes/*.controller.ts` import only from `libraries/nestjs-libraries` and other `apps/backend` services. **Reject** controllers importing repositories, Prisma client, or external SDKs directly.
- Business logic lives in `libraries/nestjs-libraries/src/`. **Reject** logic embedded in controllers (anything beyond DTO validation, guard wiring, and one service call).
- Repositories (`libraries/nestjs-libraries/src/database/prisma/<area>/*.repository.ts`) are the only callers of `PrismaClient`. Services depend on repositories, never on Prisma directly.
- Orchestrator (`apps/orchestrator/src/`) holds Temporal workflows/activities only. **Reject** Temporal imports leaking into `apps/backend` services.

## 2. TDD compliance (Must)

- Every change to a `*.service.ts`, `*.repository.ts`, `*.provider.ts`, or `*.factory.ts` ships with the matching `*.spec.ts` in the same diff. The TDD hook in `.claude/hooks/tdd-check.sh` enforces this for Claude sessions; reviewers enforce it for human PRs.
- Bug fixes include a **failing-then-passing** spec proving the bug existed.
- Reject specs added without source changes when they assert future state ("vai funcionar quando…") — that is wishful coverage.

## 3. Frontend i18n (Must)

- No hardcoded strings in JSX. Every user-visible string flows through `useT()` from `@gitroom/react-shared-libraries/translation`.
- New keys live in `libraries/react-shared-libraries/src/translation/locales/pt/translation.json` (default) AND `en/translation.json`. **Reject** missing pt entry.
- pt-BR text uses **full accents** (CHANGELOG and test names follow a different no-accent convention; UI text does NOT).
- Hooks rule: each `useSWR` lives in its own dedicated hook file (per `react-hooks/rules-of-hooks`); reject inline `useSWR` calls in components.

## 4. Provider and credential contracts (Must)

- AI features must resolve credentials via `AiProviderResolverService` (`libraries/nestjs-libraries/src/ai/ai-provider-resolver.service.ts`) → `AiClientFactory`. **Reject** any direct `process.env.OPENAI_API_KEY` / `process.env.OPENROUTER_API_KEY` / `process.env.TAVILY_API_KEY` / `process.env.KIEAI_*` reads outside the AI module.
- AI errors caused by missing config return **HTTP 412** (Precondition Failed), never 402 (Payment Required) — 402 collides with the billing modal.
- Social OAuth providers (`libraries/nestjs-libraries/src/integrations/social/*.provider.ts`) propagate `ClientInformation` through both `generateAuthUrl()` and `authenticate()`. **Reject** `process.env.X_CLIENT_ID` reads inside provider methods (must come from the passed `ClientInformation`).
- Instagram comment activities route the Graph API host via `FlowActivity.resolveIgRoute`. **Reject** hardcoded `graph.facebook.com` URLs in `apps/orchestrator/src/activities/`.

## 5. Security checks (Must)

- Secrets in logs: search the diff for `console.log` / `logger.info` near tokens. Sanitize with the existing regex pattern — `Bearer\s+[\w.-]+` → `***`, `tvly-[\w.-]+` → `tvly-***`.
- Outbound `fetch` from new code: must reject SSRF targets (`localhost`, `10.*`, `192.168.*`, `172.16-31.*`, `169.254.*`, IPv6 link-local, non-`http(s)`). Use the patterns already in `ai-web-search.service.ts`.
- Encryption: any new credential field stored in DB must use `EncryptionService` (`libraries/nestjs-libraries/src/crypto/encryption.service.ts`), never plain text.
- `class-validator` DTOs are required on every controller endpoint that takes a body — reject `@Body() body: any`.
- Rate limits: new public endpoints get an explicit `@Throttle` decorator; reject silent reliance on the global default if the endpoint is cost-sensitive (AI, external APIs).

## 6. Style and conventions (Must)

- **No** `eslint-disable-next-line` anywhere. Refactor to comply. The repo treats this as non-negotiable.
- **No** `npm` component libraries (e.g., react-select, react-modal). Write native components — see `apps/frontend/src/components/ui/` for examples.
- **No** `npm` or `yarn` commands in scripts/docs — pnpm only. The Bash hook denies these.
- Indentation, quotes, semicolons: trust Prettier; the lint hook runs `pnpm lint` from the root and that is the source of truth.
- File naming: kebab-case `.ts` files matching their export class (`ai-text.service.ts` exports `AiTextService`).

## 7. Document-First and changelog (Must)

- Non-trivial PRs update `docs/architecture/` or `docs/operations/` in the **same** PR. Reject "docs come later".
- Every non-trivial commit appends an entry under `## [Unreleased]` in `CHANGELOG.md`. CHANGELOG entries use **pt-BR sem acentos** (override of project default — see `feedback_changelog_accents` memory). Sections follow Keep a Changelog: Adicionado, Alterado, Corrigido, Removido, Documentação.

## 8. API-first (Should)

- New endpoints have the contract defined in a DTO + Swagger decorators **before** UI consumes them. Look for `@ApiOperation`, `@ApiResponse` in the controller.
- UI fetches via `useFetch` from `libraries/helpers/src/utils/custom.fetch.tsx`; reject raw `fetch()` for backend calls.

## 9. Branch hygiene (Must)

- The branch name should be `feat/...`, `fix/...`, `chore/...`, or `docs/...`. **Reject** any commit landing on `postiz` (it's an upstream mirror, never customized).
- `main` is dev; `release` is production with a SemVer tag. Promotion `main → release` requires a tag. Reject release-branch commits without an accompanying tag.

## 10. Wizard ↔ Flow Builder parity (Must, when applicable)

- New automation trigger fields land in **both** the wizard (`automacoes/[id]/wizard`) AND `node-config-panel` (Flow Builder). They share the same `triggerConfig` JSON. Reject one without the other.

## Pre-flight commands

```bash
pnpm lint                   # always from repo root
pnpm test                   # full coverage (CI runs this)
pnpm build                  # catches type errors and missing dep declarations
git diff --stat origin/main # quick blast-radius view
```

## When the diff is large (>500 lines)

- Skim the architecture layers first. If layering is wrong, stop reviewing details — the rewrite is mandatory.
- Prefer dotcontext sub-agents for depth: `use the security-auditor agent to audit auth changes`, `use the database-specialist agent to review the migration`.
- Ask the author to split into **stacked PRs** (one architectural concern each) before line-by-line review.

## Canonical references in this codebase

- `CLAUDE.md` (raiz) — golden rules and per-area pointers.
- `apps/backend/CLAUDE.md` — controller/service/repository contract.
- `apps/frontend/CLAUDE.md` — i18n, SWR hooks, native components.
- `libraries/nestjs-libraries/src/ai/CLAUDE.md` — `AiProviderResolverService` contract.
- `libraries/nestjs-libraries/src/integrations/social/CLAUDE.md` — `ClientInformation` flow.
- `apps/orchestrator/CLAUDE.md` — `FlowActivity.resolveIgRoute` rule.
