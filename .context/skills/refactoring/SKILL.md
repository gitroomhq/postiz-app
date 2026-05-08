---
type: skill
name: Refactoring
description: Refactor code safely with TDD as the safety net — extract method/class, move logic across layers (Controller/Service/Repository), introduce abstractions only when justified. Use when restructuring without behavior change, splitting a large service, or migrating away from a deprecated pattern. Triggers `chore(<scope>):` commits, never `feat`.
skillSlug: refactoring
phases: [E]
generated: 2026-02-20
status: filled
scaffoldVersion: "2.0.0"
---

## Pre-conditions (Required)

- The unit being refactored has **passing specs** that cover the behavior you must preserve. If coverage is incomplete, write specs first (use `test-generation` skill) — that is GREEN before REFACTOR.
- `pnpm lint` is clean before starting. You won't know what breakage came from your refactor otherwise.
- Working tree is committed or stashed. Refactors generate noise; you want a clean baseline.

## TDD safety net

Refactor is the third leg of RED→GREEN→REFACTOR per `CLAUDE.md`. If you don't have GREEN specs, you don't have a safety net — stop and write specs first.

After each step of the refactor:
1. Run `pnpm test -- <pattern>` for the affected files.
2. Run `pnpm lint` from repo root.
3. Commit if green; revert if red.

Small, safe steps beat one heroic rewrite.

## Layer-respecting moves

Most refactors in this codebase end up moving logic between Controller / Service / Repository. The directionality is fixed:

| Smell | Move |
|---|---|
| Logic in controller (anything beyond DTO + one service call) | Pull into service |
| Service touching Prisma directly | Extract repository method |
| Repository orchestrating multiple aggregates | Pull into service |
| Service holding business rules also used by another service | Extract a shared service or domain helper into `libraries/nestjs-libraries/src/` |
| `apps/backend` importing `apps/orchestrator` | Move shared code into `libraries/nestjs-libraries/` |

Any move that **inverts** these directions is a regression — refuse it.

## Common refactors and their moves

### Extract method (in-file)

Use when a function does two distinct things or has a long body (>40 lines) where a sub-block has a clear name.

1. Name the new method as the *what* (`computeAspectRatioFor` not `helper2`).
2. Make it `private` if only the parent calls it.
3. Spec only the parent (you're refactoring; the new method is internal).

### Extract class / service

Use when a service grew >300 lines or has cohesive cluster of methods around a sub-domain.

1. Add the new class with a focused interface.
2. Inject it into the original service.
3. Move methods one at a time; keep specs green between each move.
4. Update DI in the relevant `*.module.ts`.

### Move from controller to service

Use when reviewer flags business logic in the controller.

1. Move the logic verbatim to the service.
2. Replace the controller body with `return this.service.method(...)`.
3. Specs that hit the service still pass; if there were controller-only specs, they become integration-style.

### Replace `process.env.X` with a resolver

Specific to AI/OAuth: any `process.env.OPENAI_API_KEY` etc. outside the AI module is a bug. Replace with `AiProviderResolverService` resolution. For social OAuth, replace with `ClientInformation` propagation. (See `code-review` skill for the contracts.)

### Tightening Prisma queries

Use when N+1 or missing index is hurting hot paths.

1. Confirm the query plan via Prisma logs (`DATABASE_URL` with `?statement_logging=true`).
2. Add `include`, `select`, or use a single `findMany` with `where: { in: [...] }`.
3. Add a regression spec for the count of queries (mock and assert call count).

## Don't refactor these without explicit ticket

- **Cross-module abstractions** that don't exist yet — three similar lines is better than a premature abstraction (`CLAUDE.md` rule).
- **Frameworks or vendor SDK upgrades** — those are `chore(deps):` PRs, not refactors.
- **Database schema** — those are migrations, with their own review checklist (consult `database-specialist` agent).
- **Branding or strings** — those are `i18n` or `chore(branding):` PRs.

## Commit hygiene

- Refactors are `chore(<scope>):` or `refactor(<scope>):` — never `feat`.
- One refactor step per commit. "Move X to service" + "rename Y" are two commits.
- Mention the *why* in the body if non-obvious (e.g., "preparando para suporte a workspace per-profile", "removendo dependencia entre orchestrator e backend").

## Anti-patterns

- Refactoring without GREEN specs — gambling.
- Refactoring while shipping a `feat` in the same PR — splits the diff cognitively.
- "Just renaming this for clarity" while also changing behavior — split.
- Adding a layer of indirection for hypothetical future requirements — the codebase rule is to avoid speculative abstractions.
- `eslint-disable-next-line` to silence a rule that the refactor revealed — fix the underlying issue.
- Removing tests because they "no longer fit the new shape" — your refactor changed behavior; that is no longer a refactor.

## Quick checklist before opening the PR

```bash
pnpm lint                       # raiz
pnpm test                       # full coverage
git diff --stat origin/main     # ratio additions/deletions sane?
git log --oneline                # commits granular?
```

## Canonical references

- `CLAUDE.md` (raiz) — Controller/Service/Repository layering.
- `apps/backend/CLAUDE.md` — backend layering specifics.
- `libraries/nestjs-libraries/CLAUDE.md` — shared lib boundaries.
- `test-generation` skill — TDD GREEN before REFACTOR.
- `code-review` skill — what reviewers will check after the refactor.
