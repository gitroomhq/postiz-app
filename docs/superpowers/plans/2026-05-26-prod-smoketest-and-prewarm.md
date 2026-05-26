# Prod Smoketest + Dev Pre-warm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Empirically measure prod build perf against captured dev numbers, and add a pre-warm script that hides the dev cold-compile penalty.

**Architecture:** Two deliverables. (B) `apps/frontend/scripts/prewarm.mjs` is a 30-line ESM script that polls `localhost:4200` for readiness then sequentially fetches the top 5 routes; wired via a new `pnpm prewarm` script. (A) Run `next build`, serve via `next start`, measure 4 routes with the same /browse perf tool used in dev testing, then write a comparison findings doc to `docs/perf/`.

**Tech Stack:** Node 24.14 ESM (native fetch, native AbortController), pnpm workspaces, Next.js 16.2.6 (webpack dev currently, will switch to next start prod for measurement), /browse skill for Chrome-based perf capture.

**Order:** B first (committable in isolation, no service swap). A second (requires stopping the dev server on port 4200). Findings doc committed after A's measurements complete.

**Spec:** `docs/superpowers/specs/2026-05-26-prod-smoketest-and-prewarm-design.md`

---

## File Structure

**Created:**
- `apps/frontend/scripts/prewarm.mjs` — pre-warm script (Task 1)
- `docs/perf/2026-05-26-prod-smoketest.md` — findings doc (Task 4)

**Modified:**
- `apps/frontend/package.json` — add `prewarm` script (Task 1)

**Runtime artifacts (not committed):**
- `apps/frontend/.next/` — production build output (Task 2)

Both files are small (under 100 lines each). No file split decisions needed; both already have a single clear responsibility.

---

## Task 1: Pre-warm script (B)

**Files:**
- Create: `apps/frontend/scripts/prewarm.mjs`
- Modify: `apps/frontend/package.json` (add one script entry)

This task is self-contained: dev server can be running or not, no other tasks block it.

- [ ] **Step 1: Create the pre-warm script**

Create `apps/frontend/scripts/prewarm.mjs` with this exact content:

```javascript
#!/usr/bin/env node
// Pre-warm Next.js dev server by hitting common routes so cold-compile
// happens before the user's first click. Run manually after `next dev` boots.

const BASE = process.env.PREWARM_BASE || 'http://localhost:4200';
const ROUTES = ['/', '/auth/login', '/launches', '/analytics', '/settings'];
const READINESS_TIMEOUT_MS = 60_000;
const READINESS_POLL_MS = 500;
const PER_ROUTE_TIMEOUT_MS = 30_000;

async function waitReady() {
  const deadline = Date.now() + READINESS_TIMEOUT_MS;
  process.stdout.write(`[prewarm] waiting for ${BASE} ...`);
  while (Date.now() < deadline) {
    try {
      const r = await fetch(BASE, { method: 'HEAD' });
      if (r.ok || r.status === 404 || r.status === 500) {
        process.stdout.write(' ready\n');
        return true;
      }
    } catch {
      // server not up yet
    }
    process.stdout.write('.');
    await new Promise((res) => setTimeout(res, READINESS_POLL_MS));
  }
  process.stdout.write(' TIMEOUT\n');
  return false;
}

async function warmRoute(path) {
  const url = `${BASE}${path}`;
  const t0 = Date.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), PER_ROUTE_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ac.signal });
    const ms = Date.now() - t0;
    console.log(`[prewarm] ${path} → ${r.status} in ${ms}ms`);
    return r.status < 500;
  } catch (e) {
    const ms = Date.now() - t0;
    console.log(`[prewarm] ${path} → FAIL in ${ms}ms (${e.name})`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const ready = await waitReady();
  if (!ready) {
    console.error(`[prewarm] server never became ready at ${BASE}`);
    process.exit(1);
  }
  const t0 = Date.now();
  let ok = 0;
  for (const route of ROUTES) {
    if (await warmRoute(route)) ok++;
  }
  const totalS = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[prewarm] Done. ${ok}/${ROUTES.length} routes warmed in ${totalS}s`);
  process.exit(ok === ROUTES.length ? 0 : 1);
}

main();
```

- [ ] **Step 2: Smoke-test the script against a non-running server (verifies timeout path)**

Run from repo root:

```bash
PREWARM_BASE=http://localhost:9999 node apps/frontend/scripts/prewarm.mjs
```

Expected: prints `[prewarm] waiting for http://localhost:9999 ...` followed by dots for 60s, then `TIMEOUT` and `server never became ready`, exit code 1.

To avoid waiting the full 60s during test, instead run with a short timeout via env override:

```bash
PREWARM_BASE=http://localhost:9999 timeout 5 node apps/frontend/scripts/prewarm.mjs || echo "killed as expected"
```

Expected: script gets killed by `timeout`, output shows it was polling.

- [ ] **Step 3: Smoke-test against the running dev server (positive path)**

The dev server is currently running on port 4200 (started earlier this session via mcp__Claude_Preview). Run:

```bash
node apps/frontend/scripts/prewarm.mjs
```

Expected output (status codes may include 200/307/redirect — anything <500 counts as warmed):
```
[prewarm] waiting for http://localhost:4200 ... ready
[prewarm] / → 200 in <Nms>
[prewarm] /auth/login → 200 in <Nms>
[prewarm] /launches → <status> in <Nms>
[prewarm] /analytics → <status> in <Nms>
[prewarm] /settings → <status> in <Nms>
[prewarm] Done. 5/5 routes warmed in <Ns>
```

Exit code 0. If any route returns 500, exit code 1 and the failure is logged.

If a route 500s, that's a real bug — fix the underlying issue before continuing (do NOT make the script tolerant of 500s, the whole point is detecting broken routes).

- [ ] **Step 4: Wire the script into package.json**

Modify `apps/frontend/package.json`. Find the `scripts` block (around line 6) and add a `prewarm` entry. The current scripts block looks like:

```json
"scripts": {
  "dev": "dotenv -e ../../.env -- next dev -p 4200",
  "dev:webpack": "dotenv -e ../../.env -- next dev -p 4200 --webpack",
  "fetch-gtm": "node scripts/fetch-gtm.mjs",
  ...
}
```

Add after `dev:webpack`:

```json
    "prewarm": "node scripts/prewarm.mjs",
```

Final excerpt:

```json
"scripts": {
  "dev": "dotenv -e ../../.env -- next dev -p 4200",
  "dev:webpack": "dotenv -e ../../.env -- next dev -p 4200 --webpack",
  "prewarm": "node scripts/prewarm.mjs",
  "fetch-gtm": "node scripts/fetch-gtm.mjs",
  ...
}
```

- [ ] **Step 5: Verify the pnpm-wired command works**

Run from repo root:

```bash
pnpm --filter ./apps/frontend run prewarm
```

Expected: same output as Step 3, but invoked through pnpm. Exit code 0.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/scripts/prewarm.mjs apps/frontend/package.json
git commit -m "feat(frontend): add prewarm script to hide cold-compile penalty

Polls localhost:4200 for readiness then sequentially fetches the top 5
routes so Next.js dev's on-demand compile happens before the user's
first click. Run manually in a second terminal: pnpm prewarm.

Not auto-spawned with next dev — spawning together makes boot perception
worse and ties prewarm to every dev run."
```

---

## Task 2: Stop dev server + production build

**Files:**
- Modify: `apps/frontend/.next/` (build output; not committed)

This task takes 3-5 minutes (the build itself).

- [ ] **Step 1: Stop the running dev server**

The webpack dev server is currently on port 4200 (serverId `d4a8c4b5-04d3-456d-adc4-e098b38f53e4` per mcp__Claude_Preview). Stop it:

Use the `mcp__Claude_Preview__preview_stop` tool with that serverId. Or if not available, find the PID owning port 4200 and terminate:

```bash
# Windows (Git Bash):
netstat -ano | grep ":4200" | head -1
# Note the PID, then:
taskkill //F //PID <PID>
```

Expected: port 4200 is free.

- [ ] **Step 2: Verify port 4200 is free**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:4200/ --max-time 2 || echo "no server"
```

Expected: `no server` or `000`. If you see `200` something is still serving — stop it.

- [ ] **Step 3: Run the production build**

From repo root:

```bash
pnpm --filter ./apps/frontend run build
```

Expected duration: 3-5 minutes. Output ends with a route-by-route size table and "✓ Compiled successfully" or equivalent.

Sentry sourcemap upload happens during this build. The `next.config.js` `errorHandler` swallows Sentry failures (line 104-110 of that file), so missing `SENTRY_AUTH_TOKEN` won't fail the build — it just prints "Sentry build error occurred" and continues.

- [ ] **Step 4: Verify the build artifact exists**

```bash
ls apps/frontend/.next/BUILD_ID
ls apps/frontend/.next/server/app
```

Expected: `BUILD_ID` is a small file with the build hash. `.next/server/app/` contains compiled route directories like `(public)`, `(app)`, etc.

If the build failed: do not proceed. Read the error, fix the underlying issue (or coordinate with the user if it's an env var problem), retry. Do NOT skip this step.

- [ ] **Step 5: Note success**

No commit needed (`.next/` is gitignored). Just confirm:

```bash
echo "build OK"
```

Proceed to Task 3.

---

## Task 3: Run prod server + measure 4 routes

**Files:** None modified. This is a measurement task — output captured for Task 4.

**Browse tool path:** `$B = /c/Users/PC/.claude/skills/gstack/browse/dist/browse` (already built per earlier setup check).

- [ ] **Step 1: Start the production server**

From repo root, in a background process so it doesn't block:

```bash
pnpm --filter ./apps/frontend run start
```

Or via `mcp__Claude_Preview__preview_start` if a new launch config is added. Since `apps/frontend/package.json` has `"start": "dotenv -e ../../.env -- next start -p 4200"`, this serves the build on port 4200.

Add a new launch.json entry to make it preview-startable. Update `.claude/launch.json` to include:

```json
{ "name": "frontend-prod", "runtimeExecutable": "pnpm", "runtimeArgs": ["--filter", "./apps/frontend", "run", "start"], "port": 4200 }
```

Then call `mcp__Claude_Preview__preview_start` with `name: "frontend-prod"`.

- [ ] **Step 2: Verify the prod server is up**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:4200/ --max-time 10
```

Expected: `200`.

- [ ] **Step 3: Drive /browse against landing page**

```bash
B="/c/Users/PC/.claude/skills/gstack/browse/dist/browse"
$B goto http://localhost:4200/
$B perf
$B console --errors
$B network | head -20
```

Capture the output. Record TTFB, DOM parse, DOM ready, total, and the total payload size summed from network output.

- [ ] **Step 4: Measure /auth/login**

```bash
$B goto http://localhost:4200/auth/login
$B perf
$B console --errors
$B network | head -20
```

Record numbers.

- [ ] **Step 5: Measure /dashboard**

```bash
$B goto http://localhost:4200/dashboard
$B perf
$B console --errors
$B network | head -20
```

Record numbers.

- [ ] **Step 6: Measure /launches**

```bash
$B goto http://localhost:4200/launches
$B perf
$B console --errors
$B network | head -20
```

Record numbers. Note: `/launches` requires auth — if it redirects to /auth/login, that's expected and still measurable (perf of the redirect chain matters).

- [ ] **Step 7: Stop the prod server**

Use `mcp__Claude_Preview__preview_stop` with the serverId returned in Step 1. Verify port 4200 freed:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:4200/ --max-time 2 || echo "stopped"
```

Expected: `stopped` or `000`.

Proceed to Task 4 with the captured numbers.

---

## Task 4: Write findings doc + commit

**Files:**
- Create: `docs/perf/2026-05-26-prod-smoketest.md`

- [ ] **Step 1: Create the findings doc**

Create `docs/perf/2026-05-26-prod-smoketest.md` using this template. Replace every `<placeholder>` with actual numbers from Task 3.

```markdown
# Production Smoketest — 2026-05-26

After the Lamborghini UI rebuild + 18-component lazy-load refactor, this is the empirical prod-vs-dev perf snapshot.

## Setup

- **Dev mode:** webpack (Next 16.2.6, Node 24.14, port 4200)
- **Prod mode:** `next build` + `next start` (same Node, same port, same .env)
- **Measurement:** /browse Chrome via `$B perf` + `$B network`
- **Routes:** `/`, `/auth/login`, `/dashboard`, `/launches`

## Numbers

### Time-to-DOM-ready (ms)

| Route | Dev cold | Dev warm | Prod | Notes |
|---|---|---|---|---|
| `/` | 14274 | 163 | <PROD_LANDING_DOM_READY> | <NOTE> |
| `/auth/login` | 1068 | 215 | <PROD_LOGIN_DOM_READY> | <NOTE> |
| `/dashboard` | 468 | 319 | <PROD_DASHBOARD_DOM_READY> | <NOTE> |
| `/launches` | (not measured in dev) | n/a | <PROD_LAUNCHES_DOM_READY> | requires auth |

### TTFB (ms)

| Route | Dev cold | Dev warm | Prod |
|---|---|---|---|
| `/` | 10689 | 39 | <PROD_LANDING_TTFB> |
| `/auth/login` | 863 | 51 | <PROD_LOGIN_TTFB> |
| `/dashboard` | 175 | 61 | <PROD_DASHBOARD_TTFB> |
| `/launches` | n/a | n/a | <PROD_LAUNCHES_TTFB> |

### Initial payload (sum of main route bundle, KB)

| Route | Dev | Prod | Reduction |
|---|---|---|---|
| `/` | ~12000 | <PROD_LANDING_PAYLOAD> | <DELTA> |
| `/auth/login` | ~12000 | <PROD_LOGIN_PAYLOAD> | <DELTA> |

(Dev numbers are the unminified bundle sizes captured earlier: `main-app.js` 12 MB, `main.js` 7.1 MB. Prod numbers are post-minification + tree-shake.)

## Console errors

| Route | Prod errors |
|---|---|
| `/` | <ERRORS_OR_NONE> |
| `/auth/login` | <ERRORS_OR_NONE> |
| `/dashboard` | <ERRORS_OR_NONE> |
| `/launches` | <ERRORS_OR_NONE> |

## Verdict

<one of: prod-ready / red-flag / mixed — with one sentence reasoning>

## Next steps

<one of:
- "Prod is in line with target metrics. Defer further perf work."
- "Prod shows X regression vs dev (which makes no sense — investigate Y)"
- "Prod is acceptable but X route is slow — recommend bundle-analyzer pass on that chunk"
- "Proceed with deferred approach C (Node 22 + Turbopack) to also fix dev"
>
```

- [ ] **Step 2: Verify all placeholders are filled**

```bash
grep -n "<.*>" docs/perf/2026-05-26-prod-smoketest.md
```

Expected: zero matches. If anything remains, fill it before committing.

- [ ] **Step 3: Commit the findings doc**

```bash
git add docs/perf/2026-05-26-prod-smoketest.md
git commit -m "docs(perf): prod smoketest results after Lamborghini rebuild

Real-Chrome perf comparison of next build + next start vs the webpack
dev server, on landing/auth/dashboard/launches routes. Captures TTFB,
DOM ready, payload size, console errors per route.

See doc for verdict + next steps."
```

- [ ] **Step 4: Restart dev server for the user**

The user was running webpack dev earlier; restore that state so they can keep working.

Update `.claude/launch.json` if `frontend-prod` entry remains (it can stay — it's useful for future smoketests).

Start the dev server again:

```bash
pnpm --filter ./apps/frontend run dev:webpack
```

Or via `mcp__Claude_Preview__preview_start` with `name: "frontend"` (which is `dev:webpack`).

Verify:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:4200/ --max-time 30
```

Expected: `200` (cold) or fast 200 (warm).

- [ ] **Step 5: Final report to user**

Print the verdict line from the findings doc plus the next-step recommendation. Mention:
- `pnpm prewarm` is wired and committed (Task 1)
- Prod smoketest committed at `docs/perf/2026-05-26-prod-smoketest.md`
- Dev server is back up

---

## Self-review notes

Coverage check vs spec sections:
- **A — Production smoketest:** Tasks 2-4 ✓
- **B — Pre-warm script:** Task 1 ✓
- **Implementation order (B first then A):** Tasks numbered accordingly ✓
- **Build risks (Sentry, env vars, duration):** Called out in Task 2 ✓
- **Output doc at `docs/perf/2026-05-26-prod-smoketest.md`:** Task 4 ✓
- **What we'll know at the end:** Captured in the "Verdict" + "Next steps" sections of the findings doc template ✓

No placeholders in this plan (only template placeholders inside the findings-doc template, which Task 4 Step 2 enforces filling).

Type/signature consistency: only one function signature appears (the prewarm script's internal helpers), all consistent within Task 1.
