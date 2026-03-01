# Postiz Desktop App

Native macOS (and Linux) desktop app for [Postiz](https://postiz.com). Runs the full Postiz stack — backend, frontend, workflow engine, and embedded database — as a single self-contained application. No Docker, PostgreSQL, Redis, or external services required.

## End Users: Download and Install

Download the latest `Postiz_<version>_aarch64.dmg` (Apple Silicon) or `Postiz_<version>_x86_64.dmg` (Intel) from the releases page.

On first launch macOS Gatekeeper may warn "unverified developer." Right-click the app → **Open** to proceed. The app auto-configures itself:

- Generates a random `JWT_SECRET` on first run (saved to `~/Library/Application Support/Postiz/config.toml`)
- Creates an embedded PostgreSQL database via PGlite
- Initializes the full database schema automatically
- Selects available ports (defaults: backend 3000, frontend 4200, Temporal 7233)

Create an account at the registration screen — no email verification needed in desktop mode.

---

## Developers: Build from Source

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Rust | stable | `curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf \| sh` |
| Node.js | 22.x | [nodejs.org](https://nodejs.org) or `volta install node@22` |
| pnpm | 10.x | `npm install -g pnpm@10` |
| Xcode Command Line Tools | (macOS only) | `xcode-select --install` |

### Build (one command)

From the repository root:

```bash
pnpm desktop:build
```

This single command does everything:

1. Installs dependencies
2. Compiles backend, frontend, and orchestrator TypeScript
3. Downloads Node.js and Temporal sidecar binaries for the host platform
4. Deploys production node_modules (pruned, no dev deps)
5. Generates `schema.sql` from the Prisma schema for database initialization
6. Validates all build artifacts
7. Compiles the Rust binary and bundles the `.app` and `.dmg`

First build: 20-40 minutes (Rust compilation, Next.js build, pnpm deploy).
Subsequent builds: faster due to incremental Rust compilation.

### Rebuild after code changes

When only the TypeScript source changed (not Rust):

```bash
# Recompile just backend + orchestrator (fast, ~2 min)
pnpm build:backend
pnpm build:orchestrator

# Re-prepare resources + schema.sql + rebuild .app (skips TS recompile)
POSTIZ_SKIP_BUILD=1 pnpm desktop:build
```

### Hot-deploy frontend without full Tauri rebuild

When iterating on frontend-only changes (Next.js / React), you can deploy without rebuilding Rust:

**Step 1 — Build the Next.js standalone bundle:**

```bash
cd apps/frontend
DESKTOP_BUILD=1 STORAGE_PROVIDER=local NEXT_PUBLIC_BACKEND_URL=http://localhost:3000 pnpm run build
```

**Step 2 — rsync it into the running .app bundle:**

```bash
BUNDLE="src-tauri/target/release/bundle/macos/Postiz.app/Contents/Resources/resources/frontend"
SRC="apps/frontend"

rsync -a --delete "${SRC}/.next/standalone/" "${BUNDLE}/standalone/"
rsync -a --delete "${SRC}/.next/static/" "${BUNDLE}/standalone/apps/frontend/.next/static/"
rsync -a --delete "${SRC}/public/" "${BUNDLE}/standalone/apps/frontend/public/"
```

**Step 3 — Restart the Next.js server:**

Kill the running next-server process and restart it with the env vars Tauri injects. Read `JWT_SECRET` from `~/Library/Application Support/Postiz/config.toml`:

```bash
# Kill old server
kill $(lsof -ti:4200) 2>/dev/null || true

# Restart (substitute your actual JWT_SECRET from config.toml)
BUNDLE="src-tauri/target/release/bundle/macos/Postiz.app/Contents/Resources/resources"
NODE="src-tauri/target/release/bundle/macos/Postiz.app/Contents/MacOS/node"
FRONTEND="${BUNDLE}/frontend/standalone/apps/frontend"
JWT_SECRET="<value from ~/Library/Application Support/Postiz/config.toml>"

DESKTOP_COOKIE_MODE=true STORAGE_PROVIDER=local PORT=4200 HOSTNAME=localhost \
  JWT_SECRET="${JWT_SECRET}" \
  NEXT_PUBLIC_BACKEND_URL=http://localhost:3000 \
  BACKEND_URL=http://localhost:3000 \
  BACKEND_INTERNAL_URL=http://localhost:3000 \
  FRONTEND_URL=http://localhost:4200 \
  "${NODE}" "${FRONTEND}/server.js" &
```

Wait ~5 seconds for the server to start, then reload the Postiz window.

### Development mode

```bash
pnpm desktop:dev
```

Runs `tauri dev` — Rust compiles and the app opens. Services are spawned by the Rust binary using development resource paths (`target/debug/resources/`). Requires the JS apps to have been built at least once.

### Launch the built app

```bash
pnpm desktop:start
```

Opens `src-tauri/target/release/bundle/macos/Postiz.app` directly.

---

## Architecture

```
Postiz.app
├── MacOS/
│   ├── postiz-desktop      # Tauri/Rust launcher (orchestrates all services)
│   ├── node-<triple>       # Node.js 22 sidecar (runs backend, frontend, orchestrator)
│   └── temporal-<triple>   # Temporal dev server sidecar
└── Resources/resources/
    ├── backend/            # NestJS API + PGlite + production node_modules
    │   └── prisma/
    │       └── schema.sql  # Pre-generated DDL (applied on first launch)
    ├── orchestrator/       # Temporal worker + production node_modules
    └── frontend/           # Next.js standalone server
```

**Service startup order** (managed by `main.rs`):

1. **Temporal** (port 7233 gRPC, 8233 UI) — workflow engine, SQLite-backed
2. **Backend** (port 3000) — NestJS API; initializes PGlite schema on first run
3. **Frontend** (port 4200) — Next.js SSR; served directly in the Tauri webview
4. **Orchestrator** — Temporal worker; connects to Temporal and backend

Health checks poll each service with exponential backoff (up to ~3 minutes total). The loading screen shows until all services are ready.

### Database initialization

PGlite is an embedded PostgreSQL compiled to WASM — it has no TCP server, so `prisma db push` cannot reach it. Instead:

- At build time: `prisma migrate diff --from-empty` generates `schema.sql`
- At runtime: `prisma.service.ts` checks for the `Organization` table; if missing, executes `schema.sql` via `db.exec()` before accepting connections
- On subsequent runs: the table probe succeeds and initialization is skipped

### Data location (macOS)

| Data | Path |
|------|------|
| Config (JWT secret, ports) | `~/Library/Application Support/Postiz/config.toml` |
| Database | `~/Library/Application Support/Postiz/pglite-data/` |
| File uploads | `~/Library/Application Support/Postiz/uploads/` |
| Temporal workflows | `~/Library/Application Support/Postiz/temporal.db` |

---

## Version Management

The app version must be kept in sync across three files. When bumping versions, update all three:

| File | Field |
|------|-------|
| `apps/desktop/src-tauri/tauri.conf.json` | `"version"` |
| `apps/desktop/src-tauri/Cargo.toml` | `version` in `[package]` |
| `apps/desktop/package.json` | `"version"` |

The version should match the latest git tag (e.g., `v2.12.1` → `2.12.1` without the `v` prefix).

```bash
# Check current version
git describe --tags --abbrev=0
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| App won't open ("unverified developer") | No code signing | Right-click → Open |
| Blank white window | CSP or service startup failure | Check Console.app for `[postiz]` log lines |
| Login page won't load | Frontend not yet ready | Wait 30–60 seconds for health checks to pass |
| "Schema SQL not found" in logs | Build artifact missing | Run `pnpm desktop:build` to regenerate |
| Port already in use | Previous instance still running | `lsof -ti:3000,4200,7233 \| xargs kill -9` |
| PGlite data corrupted | Unclean shutdown | Move `~/Library/Application Support/Postiz/pglite-data/` to back it up, restart app |

### Reading logs

The Rust launcher writes to stdout/stderr tagged by service:

```
[postiz] ...   # Tauri launcher events
[backend] ...  # NestJS backend output
[frontend] ... # Next.js output
[orchestrator] ... # Temporal worker output
[temporal] ... # Temporal server output
```

On macOS, view with: `open /Applications/Postiz.app` then check **Console.app** → search for "Postiz".

---

## Configuration

The app auto-configures itself on first run. Manual overrides can be placed in `~/Library/Application Support/Postiz/config.toml`:

```toml
jwt_secret = "your-secret-here"
backend_port = 3000
frontend_port = 4200
temporal_port = 7233
temporal_ui_port = 8233
auto_find_ports = true
```

### Social Platform Integrations (OAuth credentials)

To connect social media accounts (X/Twitter, Google/YouTube, LinkedIn, etc.) you need to supply API credentials from each platform's developer portal. Create a file at:

```
~/Library/Application Support/Postiz/postiz.env
```

Use the same format as a standard `.env` file — one `KEY=VALUE` per line, `#` for comments:

```bash
# X (Twitter) — https://developer.twitter.com/en/portal
X_API_KEY=your_api_key
X_API_SECRET=your_api_secret

# Google (YouTube, Google Business) — https://console.cloud.google.com
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# LinkedIn — https://www.linkedin.com/developers
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret

# Add any other Postiz-supported platform vars here
```

**OAuth callback URL to register in each platform's developer app:**

```
http://localhost:4200/integrations/social/<platform>
```

For example, register `http://localhost:4200/integrations/social/x` as the callback URL in your Twitter/X developer app. Most platforms (X, Google, LinkedIn) allow `http://localhost` for desktop/development use. Facebook and Instagram require HTTPS — those platforms require a hosted deployment.

All variables from `postiz.env` are forwarded to the backend service on startup. The launcher's infrastructure settings (`DATABASE_URL`, `JWT_SECRET`, port assignments) take priority and cannot be overridden from this file.

---

## License

[AGPL-3.0](../../LICENSE)
