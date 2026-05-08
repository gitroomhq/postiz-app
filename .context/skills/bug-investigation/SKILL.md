---
type: skill
name: Bug Investigation
description: Systematically reproduce, isolate, and fix a bug in the Robô MultiPost stack — backend (NestJS+Prisma), frontend (Next.js+SWR), orchestrator (Temporal), AI agent (Mastra). Use when a user reports an issue, a test fails intermittently, or behavior diverges from the doc. Always end with a failing-then-passing spec.
skillSlug: bug-investigation
phases: [E, V]
generated: 2026-02-20
status: filled
scaffoldVersion: "2.0.0"
---

## Discipline (in order — don't skip)

1. **Reproduce** before theorizing. A bug you can't reproduce is a hypothesis.
2. **Isolate** the smallest input/state that triggers it.
3. **Find root cause**, not the first sympathetic symptom.
4. **Write the failing spec** that captures the bug at its real boundary.
5. **Fix** — minimum code to turn the spec green.
6. **Refactor only if needed** to keep the codebase clean (separate commit).
7. **Document** the fix in the commit body and `CHANGELOG.md` `### Corrigido`.

Skipping straight to step 5 is how the same bug comes back next quarter.

## Reproducing by area

### Backend / API

- Confirm the request: `curl` with explicit headers, capture status + body.
- Check NestJS logs (stdout in dev). Look for the request log line and any thrown exception.
- If the bug is intermittent, check Redis state, Prisma transactions, and recent migrations.
- Reproduce in spec: pick the matching `*.service.spec.ts` or `*.repository.spec.ts` and add a failing case.

### Frontend / UI

- Open the screen in the browser; Network tab + Console open.
- Capture the failing flow: which buttons, which form values, which response codes.
- Check the SWR hook involved (`apps/frontend/src/hooks/use-*.hook.ts`). Look at request URL, params, fallback data.
- Verify `useT()` keys exist in `pt/translation.json` AND `en/translation.json` — missing keys silently render the key string.

### Orchestrator / Temporal

- Open Temporal Web UI, find the workflow run.
- Read the activity history (failures, timeouts, retries).
- Check `apps/orchestrator/src/workflows/*.workflow.ts` and the activities it calls.
- Reproduce locally by triggering the same workflow input via the CLI or the schedule that originated it.

### AI Agent (Mastra)

- Reproduce the exact user prompt + persona + integration set.
- Check `libraries/nestjs-libraries/src/chat/load.tools.service.ts` for tool registration.
- Add `console.log` *temporarily* in the tool to see args; remove before commit.
- If the model misbehaves, check provider resolution (`AiProviderResolverService` chain: profile → workspace → 412).

### Cross-cutting

- Reproduce with the **same data** (or a sanitized copy). Many bugs depend on production-shaped state.
- For race conditions: rerun the spec/scenario 10x. If it fails 1/10, you have a flake — keep investigating.

## Isolation moves

- **Bisect by code:** `git bisect start; git bisect bad; git bisect good <known-good-sha>` — narrows to the introducing commit.
- **Bisect by config:** disable env vars one by one (`DISABLE_BILLING`, `DISABLE_MARKETPLACE`, `AI_CREDITS_MODE`) to see if the bug is gated.
- **Bisect by user:** does the bug repro for default profile only? for org admin only? for self-hosted vs managed? identify the privilege/state that gates it.
- **Bisect by integration:** if it's a per-provider bug (e.g., LinkedIn breaking but Twitter fine), look in the specific provider file under `libraries/nestjs-libraries/src/integrations/social/`.

## Root cause heuristics

- **"Worked before, broke after upgrade"** → diff the package change; many breakages come from minor SDK semver changes (e.g., Mastra v1.21 renamed `runtimeContext` → `requestContext`).
- **"Works in dev, breaks in prod"** → env var differences, Redis cache state, Postgres version, file paths (case-sensitivity on Linux vs macOS).
- **"Random failures"** → race condition in async cleanup, missing `await`, or shared mutable state across requests.
- **"AI returns wrong shape"** → schema drift between provider and what the parser expects; check the AI client factory + the model id (`isReasoningModel` etc.).
- **"Translation missing"** → key absent in one of the locale files; keys must exist in both.
- **"OAuth fails after rotation"** → `ClientInformation` not being propagated through both `generateAuthUrl` and `authenticate` (per `feedback_per_profile_credentials` memory).

## The failing spec is the proof

Every bug fix PR includes a `*.spec.ts` change that:

- Asserts the **wrong** behavior would fail.
- Includes a comment in the spec body briefly noting the root cause (the *why*, not the test obvious *what*).
- Is at the right unit level — fix the spec at the layer where the bug actually lives. If the bug is in the service, the spec is on the service; resist the urge to add an end-to-end test as a substitute for a unit-level fix.

Without that spec, the PR is incomplete (per `CLAUDE.md` TDD rule).

## When the root cause is "the framework changed"

Document the migration in the commit body. Example pattern from this repo's history: `Mastra v1.21+ mudou o retorno de memory.recall()` — the commit explains the change and why the local helper now exists. Future maintainers grep for this when they hit similar issues.

## Anti-patterns

- "Fixing" by adding a try/catch that silently swallows the error — masks the bug.
- Pushing the bug down a layer instead of fixing it (e.g., adding a defensive null check in the controller when the repository should never have returned null) — finds the real fix.
- Adding the spec **after** the fix, copying the green output as expected — that spec proves nothing about the bug.
- Deleting tests that "no longer apply" without understanding why they fail — usually the test was right.
- Closing the issue without writing the CHANGELOG entry — users still see the bug in release notes if you don't.

## Commit message (use `commit-message` skill)

`fix(<scope>): <comportamento corrigido em pt-BR sem acentos>`

Body: explain the root cause and the chosen fix. Mention the commit/PR/SDK version that introduced the bug if known.

## Canonical references

- `CLAUDE.md` (raiz) — TDD non-negotiable.
- `test-generation` skill — how to write the failing spec.
- `code-review` skill — what to expect when the reviewer reads the fix.
- `docs/architecture/` per area — where the doc that described the now-broken-then-fixed behavior lives.
- `commit-message` skill — for the `fix(...)` subject convention.
