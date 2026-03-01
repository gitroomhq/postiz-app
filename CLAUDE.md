# Postiz — Claude Code Guidelines

## Desktop App Build Commands

**Source of truth:** `apps/desktop/README.md`

All commands run from **repo root** unless noted.

### Full build (first time or after Rust changes)
```bash
pnpm desktop:build
```
Does everything: pnpm install → TypeScript compile → resources prep → node_modules consolidation → `cargo tauri build` → `.app` + `.dmg`.

### After TypeScript-only changes (skip TS recompile, rebuild Rust)
```bash
POSTIZ_SKIP_BUILD=1 pnpm desktop:build
```

### After TypeScript-only changes AND deps already installed
```bash
POSTIZ_SKIP_BUILD=1 POSTIZ_SKIP_DEPS=1 pnpm desktop:build
```

### Frontend hot-deploy (no Rust recompile, fastest iteration)
See `apps/desktop/README.md` → "Hot-deploy frontend without full Tauri rebuild" for the 3-step rsync workflow.

### Launch the built .app
```bash
pnpm desktop:start
```

### Dev mode
```bash
pnpm desktop:dev
```

---

## Critical Build Rules

- **NEVER run `cargo build --release` directly** in `apps/desktop/src-tauri/`. The Tauri build system requires `resources/node_modules/` to exist (created by the build script's `consolidateNodeModules()` step). Direct cargo invocations fail with "glob pattern resources/node_modules/**/* path not found."
- **Always use `pnpm desktop:build`** (or the `POSTIZ_SKIP_BUILD` variant) — these run `apps/desktop/scripts/build-desktop.ts` which handles resource preparation before invoking cargo.
- **Xcode license:** After any Xcode update, run `sudo xcodebuild -license accept` before building.

---

## How the Build Script Works

`apps/desktop/scripts/build-desktop.ts` (invoked by all `desktop:*` commands):

1. `POSTIZ_SKIP_DEPS=1` — skips `pnpm install`
2. `POSTIZ_SKIP_BUILD=1` — skips TypeScript compilation (uses existing `dist/`)
3. Prepares resources: copies `dist/` into `src-tauri/resources/{backend,orchestrator,frontend}/`
4. `consolidateNodeModules()`: merges `backend/node_modules` + `orchestrator/node_modules` → `resources/node_modules/` (shared), then removes per-service copies
5. Generates `schema.sql` from Prisma schema (for PGlite initialization at runtime)
6. Runs `cargo tauri build` (Rust compile + `.app` bundle)

---

## Social Platform OAuth (Desktop)

Social platform credentials go in `~/Library/Application Support/Postiz/postiz.env` (dotenv format). The Rust launcher reads this at startup and forwards all vars to the backend sidecar as env vars — same vars as the web `.env` file.

```bash
X_API_KEY=...          # https://developer.twitter.com
X_API_SECRET=...
GOOGLE_CLIENT_ID=...   # https://console.cloud.google.com
GOOGLE_CLIENT_SECRET=...
LINKEDIN_CLIENT_ID=... # https://www.linkedin.com/developers
LINKEDIN_CLIENT_SECRET=...
```

OAuth callback URL to register: `http://localhost:4200/integrations/social/<platform>`

Infrastructure vars (`DATABASE_URL`, `JWT_SECRET`, etc.) cannot be overridden from `postiz.env`.

Without `postiz.env` (or with empty API keys), `generateAuthUrl()` throws → backend returns `{ err: true }` → frontend shows "Could not connect to the platform."

Facebook/Instagram require HTTPS callbacks — those need a hosted deployment.

## Key Architecture (Desktop)

- **Tauri binary** (`main.rs`): spawns backend, frontend, orchestrator as Node.js sidecars
- **Env vars injected at runtime by `main.rs`** — not baked in at build time. Includes:
  - `STORAGE_PROVIDER=local` (required for media page / Uppy upload plugin)
  - `DESKTOP_COOKIE_MODE=true` (JWT in `auth` response header → middleware sets cookie)
  - `DATABASE_URL=postgresql://localhost:5432/postiz?pglite={encoded_path}`
- **PGlite**: embedded PostgreSQL (WASM) — no TCP server, so Prisma cannot connect directly. Schema applied via `schema.sql` at first launch.
- **Shared node_modules**: `resources/node_modules/` is found automatically by both backend and orchestrator via Node.js directory traversal.

## App Bundle Layout

```
Postiz.app/Contents/
├── MacOS/
│   ├── postiz-desktop      # Tauri/Rust launcher
│   ├── node                # Node.js 22 sidecar binary
│   └── temporal            # Temporal dev server sidecar
└── Resources/resources/
    ├── backend/            # NestJS dist + prisma/schema.sql
    ├── orchestrator/       # Temporal worker dist
    ├── frontend/           # Next.js standalone
    └── node_modules/       # Shared production node_modules
```

## Data Locations (macOS)

| Data | Path |
|------|------|
| Config | `~/Library/Application Support/Postiz/config.toml` |
| Database | `~/Library/Application Support/Postiz/pglite-data/` |
| Uploads | `~/Library/Application Support/Postiz/uploads/` |
| Temporal | `~/Library/Application Support/Postiz/temporal.db` |

---

## Web / Production Build

Standard NestJS + Next.js monorepo — no special considerations beyond the usual pnpm workspace setup.

```bash
pnpm install
pnpm build          # builds all packages
```
