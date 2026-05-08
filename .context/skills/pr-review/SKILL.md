---
type: skill
name: Pr Review
description: Review a pull request as a whole (not per-line) — scope, description quality, blast radius, test plan, docs, changelog, branch hygiene, AGPL compliance. Use when reviewing a teammate's PR or your own before requesting review. For per-diff line review, use the code-review skill instead.
skillSlug: pr-review
phases: [R, V]
generated: 2026-02-20
status: filled
scaffoldVersion: "2.0.0"
---

Walk these checkpoints in order. **Block** on any failure under "Required"; **comment** on "Recommended"; **call out** on "Smell". Always cite specific file:line or commit hash when raising an issue.

## 0. Read the description first

- Title follows Conventional Commits: `type(scope): subject` in pt-BR sem acentos. Reject `WIP`, `update`, vague titles.
- Description has: **Summary** (3 bullets), **Test plan** (markdown checklist). Reject empty descriptions.
- Linked issue or context — if the change is non-trivial and there is no `docs/planning/*.md` PRD or referenced issue, push back.
- Acceptance criteria are explicit. If the description says "implements X" without listing what X means, ask for it.

## 1. Branch hygiene (Required)

- Source branch is `feat/...`, `fix/...`, `chore/...`, or `docs/...`. **Reject** PRs from `postiz` (upstream mirror, never customized).
- Target is `main` for development PRs; `release` only when promoting a tagged version.
- Branch is up to date with `main` (or has an explicit reason for being behind).
- No merge commits from main into the feature branch unless conflict resolution required it.

## 2. Scope (Required)

- One concern per PR. If the diff touches AI provider system AND a Temporal workflow AND frontend i18n unrelated to either, ask for split.
- Diff size: prefer <500 lines net. PRs >1000 lines need an explicit reason in the description (e.g., schema migration, vendor SDK upgrade).
- Generated files (Prisma client, lockfile) are in their own commit — easier to skip during review.

## 3. Test plan (Required)

- Each acceptance criterion has at least one item in the test plan checklist.
- Backend changes: `pnpm test` passes locally and in CI; the PR includes the new `*.spec.ts` (per TDD rule). **Reject** "tests will come in follow-up".
- Frontend changes touching user flows: the PR description states which screens were exercised in the browser (golden path + the non-trivial edge cases) — type-check alone is not proof.
- Bug fixes have a failing-then-passing spec proving the bug existed.

## 4. Documentation (Required)

- Non-trivial changes update `docs/architecture/`, `docs/operations/`, or per-area `CLAUDE.md` in the **same** PR.
- New env vars: documented in `.env.example` with a comment explaining default, scope, and consequences.
- New endpoints: covered in Swagger via `@ApiOperation` / `@ApiResponse` decorators.
- Breaking changes for self-hosted deployers (e.g., Docker volume layout, Postgres version, required env): note in the PR description **and** in `CHANGELOG.md` under `### Removido` / `### Alterado` with migration steps.

## 5. Changelog (Required)

- Every non-trivial commit on the branch has a corresponding line in `## [Unreleased]` of `CHANGELOG.md`. **Reject** PRs that ship behavior without a changelog entry.
- Entries are **pt-BR sem acentos**, in Keep a Changelog sections (Adicionado, Alterado, Corrigido, Removido, Documentação).
- The changelog explains the *user-visible* effect, not the internal refactor. "Refatora `AiTextService`" is not interesting; "Resposta de geração de legenda passa a respeitar persona" is.

## 6. AGPL and fork hygiene (Required)

- Postiz attribution preserved in user-visible artifacts (footer, About, package.json metadata). Reject removal.
- Branding "Robô MultiPost" applied where appropriate without erasing Postiz credit.
- No upstream-only files modified outside of an explicit `chore: sync upstream` PR (see `sync-upstream` skill / runbook).

## 7. Security and operational risk (Required, when applicable)

- New external HTTP calls: SSRF protection, timeout, retry policy, rate limit. Reject naive `fetch()` to user-supplied URLs.
- Secrets: not logged, not committed in `.env`, not hardcoded in test fixtures. Sanitize Bearer/API-key patterns in any new logger lines.
- Migrations: the diff includes both `prisma migrate dev`-generated SQL and `pnpm prisma-generate` artifacts; reviewer rejects PRs that only push schema without migration.
- Background tasks (Temporal activities, agents) have idempotency keys or are explicitly safe to retry.

## 8. Performance budget (Recommended)

- New cold-path code: no concern unless it's hot.
- Hot paths (request handler, every-tick scheduler, every-message agent tool): explicit consideration of cache (`Redis`), batching, or N+1 avoidance. Look for `Prisma.findMany` inside a loop — block.
- Frontend: avoid re-renders on form input through ad-hoc state; use the existing patterns (`useStateCallback`, dedicated SWR hooks).

## 9. Quality smells (Smell — call out)

- Any `eslint-disable-next-line` — block (this is a Must elsewhere, but at PR level it's worth flagging in case the codebase already has a stale one nearby).
- `console.log` left in source — block.
- `// TODO` without owner or ticket — comment.
- New utility added when an existing one in `libraries/helpers/src/utils/*` already does the job — comment.
- Magic numbers without a named constant or comment — comment.

## 10. After approval

- Verify the squash-merge title matches Conventional Commits format if the team uses squash.
- Tag the PR with the issue number it closes.
- For releases (`main → release`), confirm the SemVer tag is the next valid version (no skipped majors/minors).

## Pre-flight commands the author should have run

```bash
pnpm lint                       # raiz
pnpm test                       # cobertura
pnpm build                      # tipos + dep declarations
git diff --stat origin/main     # tamanho do PR
gh pr checks                    # status do CI
```

## When to delegate to sub-agents

- Schema/migration changes: `use the database-specialist agent to review the migration`.
- Auth, OAuth, encryption, webhook signing: `use the security-auditor agent`.
- Performance hot path: `use the performance-optimizer agent`.
- AGPL/upstream sync questions: refer to `sync-upstream` skill and `docs/operations/`.

## Canonical references

- `CLAUDE.md` (raiz) — golden rules and per-area pointers.
- `code-review` skill — per-diff line review (complements this PR-level checklist).
- `docs/planning/dotcontext-bootstrap.md` — when reviewing dotcontext changes.
- `CHANGELOG.md` — see `[Unreleased]` for current accepted entries; mirror their style.
