# Reference Repository Assessment (Phase 0)

> **Status:** Phase 0 deliverable. Licenses/languages verified live via the GitHub API on 2026-07-25.
> **Rule:** these are references only. Do NOT rebuild Mapped Out on any of them, do NOT copy source, do NOT replace the existing architecture. Ideas/patterns are reusable; source code and copyleft-licensed implementations are not.

## Verified facts

| Repo | License (SPDX) | Primary language | Use |
|---|---|---|---|
| `gitroomhq/postiz-app` | **AGPL-3.0** | TypeScript | The foundation (the fork's own base) |
| `brightbeanxyz/brightbean-studio` | **AGPL-3.0** | **Python** | Product/architecture concepts only |
| `refinedev/refine` | **MIT** | TypeScript | Enterprise React patterns |
| `garrytan/gstack` | MIT | TypeScript | Engineering-workflow reference |
| `DietrichGebert/ponytail` | MIT | JavaScript | Minimal-dependency discipline |
| **Mapped Out fork** (`itsmohaji/postiz-app`) | **AGPL-3.0** (declared in `package.json`) | TypeScript | The product |

## ⚠️ Licensing reality (flag for you / counsel)

**Mapped Out is already an AGPL-3.0 work** — it is a fork/derivative of AGPL Postiz and declares `AGPL-3.0` itself. AGPL's network-copyleft obligations therefore already apply to the whole application (e.g. offering corresponding source to users who interact with it over the network). Your instruction "do not import AGPL code into the commercial Mapped Out codebase" cannot make the existing base non-AGPL; it can only mean "don't add *further* copyleft code from *other* projects." This is a genuine legal matter (there is a `~/Desktop/mappedout-legal` folder) — **flagging, not resolving.** No action taken.

## Per-repository assessment

### 1. Postiz — the foundation (preserve)
- **Reuse (keep, don't rebuild):** OAuth/provider layer, Temporal publishing/scheduling/retry, token-refresh workflows, media handling, auth middleware, org tenancy, the fork-added RBAC (`RolesGuard`/`UserAssignment`) and DBU integration scaffolding.
- **Incompatible/avoid:** nothing — it *is* the base.
- **Security:** the audit's findings (IG silent-fail, per-client IDOR, DBU outbound durability, no tests, JWT expiry) all live here and are the upgrade backlog.
- **Recommendation:** extend and harden in place. Never replace working Postiz infrastructure merely because another repo has a similar feature.

### 2. BrightBean Studio — concepts only (do NOT touch code)
- **Useful ideas:** workspaces, team access, content composer with platform-specific versions, content queues, approvals, nested media folders, analytics, publishing-retry patterns, audit history, account health, social-inbox concept, notification structure, background workers.
- **Incompatible technology:** **Python** (Django-family) — a completely different stack from the NestJS/Next/Temporal fork. Do NOT introduce Python/Django; do NOT install it as a dependency.
- **Licence restriction:** **AGPL-3.0** — copyleft. Do NOT copy source. Concepts/UX patterns are fine (ideas aren't copyrightable); code is not.
- **Existing Mapped Out equivalents:** composer (`new-launch/*`), media (`media.component.tsx`), approvals (`PostApproval`/`client.controller`), account health (partial — `Integration.refreshNeeded`/`disabled`, to be surfaced).
- **Final recommendation:** study for product/UX ideas (esp. account-health surfacing, content queues, nested media folders, social inbox); implement natively in TypeScript. Zero code import.

### 3. Refine — enterprise React patterns (selective, MIT)
- **Useful ideas:** centralized resource management, access-control shape, data-provider pattern, React-Query usage, realtime updates, audit logs, versioning, enterprise CRUD design.
- **Compatible?** Partially. The fork already uses **SWR + Zustand + Next App Router + NestJS**; Refine assumes its own data-provider/router conventions.
- **Licence:** MIT — safe to depend on *if* justified.
- **Existing equivalents:** SWR (fetching), Zustand (`new-launch/store.ts`), NestJS controllers (CRUD), `getScope` (access control).
- **Final recommendation:** reference the *patterns* (a single resource/authorization abstraction, audit/versioning conventions) but do **not** adopt Refine as a framework — it would fight the existing router/auth and add a second access-control layer (explicitly disallowed). Use a specific Refine package only on a proven gap + compatibility + test-backed no-regression.

### 4. gstack — engineering-workflow reference (MIT)
- **Status in this environment:** the gstack slash-commands you referenced (`/investigate`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/autoplan`, `/review`, `/cso`, `/qa`, `/ship`) are **NOT installed here** — they are not available as skills/commands in this session, so I cannot invoke them by name.
- **Mapping to available tooling:** I map their intent onto what this environment *does* have — the Superpowers skills (brainstorming, writing-plans, systematic-debugging, test-driven-development, requesting/receiving code review, verification-before-completion, finishing-a-development-branch) plus parallel subagents for investigation/review, and `/security-review` + `/code-review` for the `/cso`+`/review`+`/qa` intents.
- **Recommendation:** apply the *discipline* (plan → build → review → verify → ship-gate). Honor your rule: **no `/ship`-equivalent (production) before your visual approval + passing tests.** If you want the actual gstack commands, they'd need installing into the Claude Code environment separately.

### 5. ponytail — minimal-dependency discipline (MIT)
- **Status:** also not installed as tooling here; I apply it as a **principle**.
- **Discipline:** avoid unnecessary dependencies, duplicated components/logic, excessive abstractions, and rewriting working features.
- **Guardrail (your rule):** this discipline must **never** weaken validation, authentication, authorization, security, error handling, accessibility, audit logging, tests, migrations, DBU compatibility, or publishing reliability. "Minimal" means no *gratuitous* additions — not fewer safeguards.
- **Recommendation:** prefer extending existing modules over adding libraries; every new dependency needs a justification, compatibility check, bundle/maintenance assessment, and test coverage.

## Net recommendation
Postiz stays the engine. Refine/BrightBean/gstack/ponytail inform *patterns and discipline only*. No stack change, no second authz layer, no Python, no copyleft code import, no framework swap. Every "reuse" is a concept re-implemented natively in the existing TypeScript stack with tests.
