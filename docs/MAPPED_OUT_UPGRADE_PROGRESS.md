# Mapped Out Upgrade — Progress Tracker

> Resumable journal for the phased upgrade. Newest first. Branch: **`mappedout-upgrade`**
> (a non-production branch — pushing it triggers **no** image build; production tag `:mappedout`
> is only built from `mappedout-branding`). Nothing here has been deployed. You review + push live.

---

## Phase status

| Phase | Scope | Status |
|---|---|---|
| **0** | Audit · IG diagnosis · DBU sync risk · authorization defect inventory | ✅ **Done** — `docs/MAPPED_OUT_UPGRADE_AUDIT.md`, `docs/REFERENCE_REPOSITORY_ASSESSMENT.md` |
| **1** | Premium design system + shell (tokens, nav, light/dark, responsive) | ⏸️ **Not started** — needs your in-situ visual review + a running UI; better done with you present |
| **2** | Authorization hardening · roles (3) · invitation/assignment · security tests | 🟡 **In progress** — security CORE landed + verified; rest planned (below) |
| **3** | Clients · Accounts · Dashboard · Calendar · Schedule Post · **IG fix + live test** | ⏸️ Not started (IG fix needs your supervision — live channel) |
| **4** | Post Library · Media Library · Campaigns · Tasks | ⏸️ Not started |
| **5** | Analytics · Reports · AI Recommendations · Performance | ⏸️ Not started |

---

## Session 1 — 2026-07-25 (autonomous; owner away)

### Delivered
1. **Phase 0** — full audit + reference assessment (2 docs), committed + pushed.
2. **Environment proven** — writable checkout at `~/Desktop/postiz-app`; `pnpm install` OK (4009 pkgs);
   `prisma generate` OK; `ts-jest`+`jest` present (note: `@nx/jest` is **missing**, so the repo's root
   `jest.config.ts` can't run — a standalone `jest.config.security.cjs` is used).
3. **Phase 2 — security CORE (release-blocking IDOR, your #2/#4):**
   - **`libraries/nestjs-libraries/src/security/authorization.util.ts`** — ONE pure, centralized
     object-level authorization decision (`isPostInScope` / `canAccessIntegration` / `isGroupInScope`),
     mirroring the proven `getPostIfAllowed` check. This is the "one centralized mechanism" you asked for.
   - **`…/authorization.util.spec.ts`** — 15 security tests (your required matrix: Client A can read A;
     cannot read/edit B by id; URL/param manipulation blocked; super-admin global; no-assignment deny;
     org boundary holds; group/export no-partial-leak). **15/15 PASS.**
   - **`posts.service.ts` `getPostIfAllowed`** refactored to use the util (single source of truth).
   - **`posts.controller.ts`** — added a shared `assertPostInScope(user, orgId, id)` helper and wired it
     into the confirmed-vulnerable by-id routes: `GET /:id`, `GET /:id/statistics`, `GET /:id/missing`,
     `PUT /:id/release-id`, `POST /:id/comments`, `PUT /:id/date`. **This closes the per-client IDOR on
     the by-id post routes** (previously org-only). Pattern is identical to the already-working
     `client.controller`, using already-injected services (no new DI).

### Verification (honest status)
- ✅ **Unit:** 15/15 security tests pass (`npx jest -c jest.config.security.cjs`). The security *decision*
  is proven.
- ✅ **Typecheck:** backend `tsc --noEmit -p apps/backend/tsconfig.json` → **0 errors in any changed file**
  (`authorization.util.ts`, `posts.controller.ts`, `posts.service.ts`). 7 total errors exist, all
  pre-existing baseline issues in unrelated files (wallet/agent-graph/autopost/media-repo/empty-provider/
  short-linking) — the repo does not fully typecheck at baseline; my changes add none.
- ❌ **NOT done (requires a running app / your gate):** app boot, route-level integration test, the
  before/after cross-client attack demo on **staging**, and your approval. Per your workflow (#5/#7) the
  fix stops here — **implemented + locally unit-tested** — pending your staging demo + approval before
  production. **I did not deploy anything.**

### Session 2 — 2026-07-25 (owner present; decisions given)
- **Group/export routes closed** (your Phase 2 item #1): added `getGroupForScopeCheck` (repo) +
  `getGroupIfAllowed` (service, uses the tested `isGroupInScope`) + shared `assertGroupInScope` helper,
  wired into `GET /group/:group` and `DELETE /:group`. `GET /group/:group/debug-export` was **already
  super-admin-only** (`if (!user.isSuperAdmin) 403`) — left as-is (already safe). 15/15 tests pass;
  0 type errors in changed files.
- **Owner decisions recorded:** role mapping SUPERADMIN→SUPER_ADMIN / ADMIN→AGENCY_ADMIN /
  USER→ACCOUNT_MANAGER (keep CLIENT), **show SUPERADMIN/ADMIN users for confirmation before migrating**;
  review environment = **social.mappedout.co** (deploy each completed phase there, wait for approval);
  **Instagram = fully hands-off (do NOT touch the live Époque IG account or do any IG work)**; order =
  finish Phase 2 → deploy → review → then Phase 1 design.
- ⚠️ **Deploying to social.mappedout.co = production deploy + `prisma db push` on the LIVE prod DB** the
  DBU integration uses. Role migration will therefore run additive-only + `prisma db pull` parity check
  first + preserve CLIENT + reversible. Awaiting owner ack that "keep production untouched" = "don't break
  DBU/portal/Époque/publishing" (not "never deploy").

### Phase 2 — CODE COMPLETE (2026-07-25, owner decisions applied)
Confirmed live users: hello@mappedout.co=SUPERADMIN(→SUPER_ADMIN), mhr9@live.com=ADMIN(→AGENCY_ADMIN)
in Mapped Out org + SUPERADMIN in unused DBU org, itsmohaji@gmail.com=CLIENT (kept). Option B chosen.
- ✅ Authz IDOR closed (by-id + group post routes) — centralized, 15 tests.
- ✅ Role model (Option B): security/roles.ts + getScope (AGENCY_ADMIN agency-wide) + team/invite UI
  (Agency Admin / Account Manager; CLIENT not offered to staff; assignment for Account Manager only) +
  labels. 7 tests.
- ✅ Capability gating: team management (invite/assignments/delete) → SUPER_ADMIN + AGENCY_ADMIN only
  (was ungated for ACCOUNT_MANAGER on this Stripe-less stack).
- ✅ No schema change (enum kept) ⇒ `prisma db push` on deploy is a no-op ⇒ no DB migration risk.
- **Backup taken before deploy:** `/root/mappedout-backups/postiz-db-20260725-214345.dump` (VPS, 142 objs).
- Coolify 419 fixed (stale cached config → `artisan optimize:clear`).
- **Deploying to social.mappedout.co for owner review** (merge → `mappedout-branding` → GHCR `:mappedout`
  → Coolify redeploy). Verify: 22/22 tests, backend+frontend tsc clean on changed files.

### Remaining for Phase 2 (deferred to when those modules exist)
- **Full object-level sweep** across the rest of the inventory as those modules exist (media, tags,
  campaigns, tasks, reports, analytics, exports, social accounts, bulk, downloads, background jobs).
  Campaigns/tasks/reports arrive in Phases 3–5 and must adopt the same `assert…InScope` primitive.
- **Full object-level sweep** across the rest of your inventory (media, campaigns, tasks, reports,
  analytics, exports, social accounts, bulk actions, file downloads, background jobs). NOTE: campaigns/
  tasks/reports as first-class modules **don't exist yet** — they arrive in Phases 3–5 and must adopt the
  same `assertInScope` primitive as they're built. Tags routes (`/tags/:id`) are org-scoped; review.
- **Role model (your 3 roles):** additive `Role` enum values `SUPER_ADMIN`/`AGENCY_ADMIN`/`ACCOUNT_MANAGER`
  (keep old values + **preserve `CLIENT`**), reversible data migration of `UserOrganization.role`, and the
  role→scope mapping (SUPER_ADMIN/AGENCY_ADMIN → `all:true`; ACCOUNT_MANAGER → assignment-scoped). **Not
  started** — schema change under `prisma db push`, needs your parity check + review.
- **Invitation + client/account assignment UI**; **JWT hardening** (pin HS256 + expiry); **positional
  role read** fix (`org.users[0].role`).

### Boundaries respected
No production deploy · no push to `mappedout-branding`/`phase2` · no live Instagram publish · no live DBU
writes · no schema push. Everything on `mappedout-upgrade`, reversible.

### Decisions taken (redirect anytime)
- Prioritized the release-blocking security core over Phase-1 design (design needs your visual review +
  a running UI I can't render here; security is self-verifiable and you called it release-blocking).
- Kept `CLIENT` untouched; will map `SUPERADMIN→SUPER_ADMIN`, `ADMIN→AGENCY_ADMIN` (you confirm which
  admins should be `SUPER_ADMIN`), `USER→ACCOUNT_MANAGER`.

### Decisions still needed from you
1. Confirm the role mapping above (esp. which existing `ADMIN`s become `SUPER_ADMIN` vs `AGENCY_ADMIN`).
2. Staging target: stand up a separate Coolify staging app fed by the `phase2` image tag? (Needed for the
   before/after IDOR demo + all future phase reviews.)
3. Order preference: proceed to finish Phase 2 (group routes + roles + invite/assignment) next, or pause
   and do Phase 1 design with you present?

### How to resume
Checkout `~/Desktop/postiz-app`, branch `mappedout-upgrade`. Run security tests:
`npx jest -c jest.config.security.cjs`. Full audit + inventory in `docs/MAPPED_OUT_UPGRADE_AUDIT.md`.
