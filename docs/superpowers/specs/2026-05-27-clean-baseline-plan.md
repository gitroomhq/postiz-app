# D3-Creator → Clean Baseline Plan (proposal, awaiting approval)

**Status:** AWAITING APPROVAL — no files will be touched until user confirms.
**Date:** 2026-05-27
**Goal:** Strip the Postiz fork down to D3 Analytics core (frontend showcase + Supabase + scraper backend), commit a clean baseline, then start scraper work on `feat/scraper-pipeline`.

---

## 0. Security alert (do FIRST, outside this plan)

Your `origin` URL in `.git/config` has a GitHub OAuth token (`gho_…`) embedded in plaintext. Anyone who reads the file or runs `git remote -v` sees it.

**Action required from you (I cannot do this for you):**
1. Revoke that token at https://github.com/settings/tokens
2. Replace remote URL with token-free form:
   ```
   git remote set-url origin https://github.com/elstonyth/D3-Creator.git
   ```
   (then authenticate via `gh auth login` or SSH key — credential helper stores the token outside the URL)

I will NOT proceed with anything that touches `git push` until this is fixed.

---

## 1. Git remote state (already mostly done)

- `origin` already points to `https://github.com/elstonyth/D3-Creator.git` ✅ (after token strip above)
- No `upstream` remote exists — nothing to detach at the git layer.
- GitHub still treats your repo as a fork of `gitroomhq/postiz-app` (metadata-only, not affecting commits).
  - To remove the GitHub fork relationship: GitHub Settings → "Detach this fork" (requires GitHub Support ticket, or transfer + transfer back). Not strictly necessary for working — just a label.

---

## 2. Branch cleanup

Delete `chore/tanstack-migration` locally and on remote:
```
git branch -D chore/tanstack-migration
git push origin --delete chore/tanstack-migration
```
**Risk:** loses 50+ commits of TanStack migration work permanently. You confirmed this is intentional ("migration is a failure — ignore it completely").

---

## 3. What to KEEP (D3 Analytics core)

### 3a. Frontend pages & components (verified imports from D3 surface)

| Path | Why keep |
|---|---|
| `apps/frontend/src/app/(public)/` | All 5 D3 routes: `/`, `/dashboard`, `/leaderboard`, `/creators/[id]`, `/creators/[id]/[platform]`, `/privacy`, `/terms` |
| `apps/frontend/src/components/creator-showcase/` | Imported by `(public)/creators/[id]/[platform]/page.tsx` |
| `apps/frontend/src/components/dashboard-showcase/` | Imported by `(public)/dashboard/page.tsx` |
| `apps/frontend/src/components/leaderboard-showcase/` | Imported by `(public)/leaderboard/page.tsx` |
| `apps/frontend/src/components/ui/` | `aurora-button`, `bento-grid`, `glass-card`, `platform-icons`, `platform-pill`, `reveal`, `use-in-view` all used by D3 pages |
| `apps/frontend/src/components/layout/mode.component.tsx` | Dark-mode toggle — imported by D3 pages |
| `libraries/react-shared-libraries/src/translation/get.transation.service.client.ts` | Imported by D3 pages (typo in name preserved) |
| `apps/frontend/public/` | Static assets, favicon, etc. |
| `apps/frontend/src/app/colors.scss` + `global.scss` | Style tokens referenced by tailwind config & globals |
| `apps/frontend/tailwind.config.cjs` + `postcss.config.mjs` | Build config |
| `apps/frontend/next.config.js` + `next-env.d.ts` | Next.js still in play on main (TanStack migration was abandoned) |
| `apps/frontend/package.json` + `tsconfig.json` | Frontend package metadata |
| `apps/frontend/vercel.json` | Vercel deploy config |

### 3b. Root config & docs

| Path | Why keep |
|---|---|
| `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` | Monorepo deps (will be slimmed later) |
| `tsconfig.base.json`, `tsconfig.json` | Path aliases (esp. `@gitroom/frontend/*`) |
| `eslint.config.mjs`, `jest.config.ts`, `jest.preset.js` | Lint/test scaffolding |
| `DESIGN.md` | D3 brand spec |
| `docs/superpowers/specs/2026-05-26-scraper-analytics-design.md` | The spec we're following |
| `docs/superpowers/specs/2026-05-27-clean-baseline-plan.md` | This doc |
| `d3-logo-official.png`, `d3-smallogo.{jpg,png}` | D3 brand assets |
| `version.txt` | Will be reset to `0.1.0` |
| `.github/` | Will be rewritten — but kept for now (CI workflows we'll need) |

### 3c. To-be-added (NEW)

| Path | Purpose |
|---|---|
| `supabase/` | Supabase CLI workspace (Step 1 of scraper plan) |
| `apps/frontend/src/app/api/` (or new `apps/api/`) | Vercel Functions for scraper triggers + cron |
| `libraries/scrapers/` | Apify adapters (one file per platform) |
| New `CLAUDE.md` | Rewritten for D3 (current one says "Project Postiz") |
| New `README.md` | Rewritten for D3 |

---

## 4. What to REMOVE (Postiz-specific)

### 4a. Postiz backend & infrastructure apps

| Path | Size | Why remove |
|---|---|---|
| `apps/backend/` | 13 MB | Postiz NestJS API — replaced by Supabase + Vercel Functions per memory direction |
| `apps/orchestrator/` | 9.1 MB | Postiz Temporal jobs — replaced by Vercel Cron per memory direction |
| `apps/commands/` | 23 KB | Postiz CLI tools |
| `apps/extension/` | 69 KB | Postiz browser extension |
| `apps/sdk/` | 17 KB | Postiz public SDK |

### 4b. Postiz business-logic libraries

| Path | Size | Why remove |
|---|---|---|
| `libraries/nestjs-libraries/` | 1.6 MB | Postiz server libs: integrations, billing, etc. (incl. `temporal/`, `services/`, `integrations/`, etc.) — none used by D3 (public) |
| `libraries/helpers/` | 110 KB | Postiz `auth/configuration/subdomain/swagger` server helpers — none imported by D3 pages |
| `libraries/react-shared-libraries/src/{form,helpers,sentry,toaster}/` | (~1 MB) | Postiz frontend libs — D3 pages only need `translation/` subdir |

**NOTE:** Keep `libraries/react-shared-libraries/src/translation/` (verified D3 dependency).

### 4c. Postiz frontend routes & components

| Path | Why remove |
|---|---|
| `apps/frontend/src/app/(app)/` | Postiz dashboard, scheduler, billing, settings |
| `apps/frontend/src/app/(extension)/` | Browser-extension UI |
| `apps/frontend/src/app/(provider)/` | OAuth provider UI |
| `apps/frontend/src/app/admin/` | Postiz superadmin |
| `apps/frontend/src/app/global-error.tsx` | Postiz error page (will recreate later) |
| `apps/frontend/src/app/polonto.css` | Polotno (Postiz creative tool) |
| `apps/frontend/src/components/{admin,agents,analytics,approved-apps,auth,autopost,billing,developer,launches,media,new-launch,new-layout,notifications,onboarding,platform-analytics,plugs,post-url-selector,preview,provider-preview,public-api,sets,settings,third-parties}/` | All Postiz feature surfaces |
| `apps/frontend/src/components/layout/` except `mode.component.tsx` | Postiz nav/sidebar |
| `apps/frontend/src/components/signature.tsx` | Postiz signature pad |
| `apps/frontend/src/components/standalone-modal/` | Postiz modal infra |

### 4d. Deploy / infra artifacts not used on Vercel

| Path | Why remove |
|---|---|
| `Dockerfile.dev`, `docker-compose.yaml`, `docker-compose.dev.yaml` | Postiz self-host stack |
| `railway.toml` | Railway deploy config (we're on Vercel) |
| `Jenkins/` | Postiz CI on Jenkins |
| `.gstack/` | Postiz dev tooling |
| `dynamicconfig/` | Postiz feature-flag config |
| `var/`, `reports/`, `install.log` | Postiz runtime artifacts (probably in `.gitignore` already, but checking) |
| `sonar-project.properties` | SonarQube (Postiz CI) |
| `i18n.json`, `i18n.lock` | Postiz i18n string table |

### 4e. Stale top-level files

| Path | Why remove |
|---|---|
| `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md` | Postiz copies referencing Gitroom |
| `qa-report.md` | Stale QA snapshot from old work |

### 4f. Migration / tanstack artifacts (none on main, on branch only)

- `chore/tanstack-migration` branch will be deleted (Section 2).
- No tanstack files exist on `main` — nothing to remove.

### 4g. Tooling tree (`.claude/`, `.agents/`)

**These are NOT product code — they're your Claude Code tooling.** Two options:

- **Option A (recommended):** Add to `.gitignore` so they stay on disk but never get committed. Keeps you free to evolve ECC tooling without polluting product diffs.
- **Option B:** Commit them as `chore: agent tooling` separately. They live in the repo but are clearly tagged.

My recommendation: **Option A**. They're 5.6 MB of plugin install + agent configs — your local working environment, not D3 code.

---

## 5. Items that need RE-WORK (not delete, but flag)

| Path | What to do |
|---|---|
| `tsconfig.base.json` paths | Remove `@gitroom/backend/*`, `@gitroom/nestjs-libraries/*`, `@gitroom/plugins/*`, `@gitroom/orchestrator/*`, `@gitroom/extension/*` aliases (their targets will be gone). Keep `@gitroom/frontend/*`, `@gitroom/helpers/*` (helpers used? check), `@gitroom/react/*`. *Or* rename `@gitroom/*` → `@d3/*` as a follow-up. |
| `package.json` (root) | After file deletes, many deps (NestJS, Temporal, integrations) become orphaned. Slim down in a follow-up commit so this one stays focused on file deletion. Leave as-is for now. |
| `apps/frontend/package.json` | Same — slim deps in follow-up. |
| `CLAUDE.md` (root) | Currently says "Project Postiz". Rewrite for D3 Analytics in a separate commit. |
| `README.md` | Postiz README. Rewrite for D3 Analytics in follow-up. |
| `apps/frontend/src/app/(public)/layout.tsx` | Uses `next/link` — fine. References `mode.component`, `get.transation.service.client` — both KEPT. |

---

## 6. Build-break warning

After deletes, `pnpm install` will still work (deps untouched) but `pnpm build` will likely fail because:

- Many `@gitroom/*` path aliases point to deleted dirs (only frontend's own aliases survive).
- `apps/frontend` might transitively reference deleted Postiz code via tsconfig.

**Mitigation:** I'll run `pnpm tsc --noEmit` after deletes and fix only the breakages that block the D3 (public) pages from compiling. Anything else (Postiz tests, etc.) stays broken until the scraper PR is done.

---

## 7. Execution sequence (after your approval)

1. **You:** rotate the GitHub token (Section 0). Confirm done.
2. **Me:** verify origin URL is sanitized.
3. **Me:** delete branch `chore/tanstack-migration` local + remote.
4. **Me:** add `.gitignore` entries for `.claude/`, `.agents/`, `design-system/`, `qa-report.md`, `skills-lock.json`, `install.log`, `reports/`, `var/`.
5. **Me:** delete all paths in Section 4a–4f as a single staging step.
6. **Me:** edit `tsconfig.base.json` to drop dead aliases.
7. **Me:** run `pnpm tsc --noEmit` from `apps/frontend/` — fix only D3 (public) compile errors.
8. **Me:** stage modified D3 pages + new showcase components (the diff that's already loose on main).
9. **Me:** commit as `chore: clean baseline — D3 Analytics v1` (one commit).
10. **You:** review the diff before push.
11. **Me:** push to `origin/main`.
12. **Me:** create `feat/scraper-pipeline` branch.
13. **Me:** rewrite `CLAUDE.md` + `README.md` for D3 in a SECOND commit on `feat/scraper-pipeline`.
14. **You:** run `/plugin marketplace add` + `/plugin install` for Apify and Supabase agent skills (Step 0 from your earlier task plan — I cannot do this for you).
15. **Me:** proceed with Step 1 + Tasks 1–10 from your earlier plan.

---

## 8. Hard checks before I delete anything

I will NOT delete files until you reply with one of:

- ✅ **Approve as-is** — proceed with all of Section 4.
- ✏️ **Modify** — tell me which keep/remove items to flip.
- ❌ **Reject** — explain the concern, I'll redraft.

I'll also produce a final `find … -print` of every path before `rm`, so you see the literal list in the terminal before deletion.
