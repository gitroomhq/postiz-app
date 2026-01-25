# Postiz Desktop App

Native macOS desktop app for [Postiz](https://postiz.com) - run Postiz without Docker.

The desktop app uses [Tauri](https://tauri.app) to wrap the Postiz web frontend in a native macOS window, with embedded services running locally.

## Prerequisites

### 1. Rust (required for Tauri)

```bash
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
```

Restart your terminal after installation.

### 2. Xcode Command Line Tools (macOS only)

```bash
xcode-select --install
```

### 3. Tauri CLI

```bash
cargo install tauri-cli
```

### 4. Temporal CLI

```bash
brew install temporal
```

### 5. Node.js and pnpm

The project uses Volta for Node.js version management (Node 22.12.0+, pnpm 10.6.1).

## Quick Start (Development)

### 1. Clone and install dependencies

```bash
git clone https://github.com/gitroomhq/postiz-app.git
cd postiz-app
pnpm install
```

### 2. Configure environment

```bash
cp .env.desktop.example .env
```

Edit `.env` and set a secure `JWT_SECRET`:

```bash
# Generate a random secret
openssl rand -hex 32
```

### 3. Generate Prisma client

```bash
pnpm run prisma-generate
```

### 4. Start backend services

In one terminal:

```bash
pnpm run desktop:start
```

Wait for "All services started successfully!" before proceeding.

### 5. Launch Tauri dev mode

In another terminal:

```bash
cd apps/desktop
pnpm run dev
```

The first build takes several minutes to compile Rust code. Subsequent builds are faster.

A native macOS window will open with the Postiz UI.

## Building for Production

Build a distributable macOS app bundle:

```bash
cd apps/desktop
pnpm run build
```

Output files:

- `target/release/bundle/macos/Postiz.app` - Native macOS app bundle
- `target/release/bundle/dmg/Postiz_0.1.0_aarch64.dmg` - DMG installer

## Configuration

See `.env.desktop.example` for all configuration options.

Key differences from Docker deployment:

| Feature | Docker | Desktop |
|---------|--------|---------|
| Database | External PostgreSQL | PGlite (embedded PostgreSQL) |
| Redis | External Redis | MockRedis (in-memory) |
| Temporal | Docker container | `temporal server start-dev` |

### Data Location

Desktop mode stores data in platform-specific directories:

- **macOS**: `~/Library/Application Support/Postiz/`
- **Linux**: `~/.local/share/postiz/`
- **Windows**: `%APPDATA%/Postiz/`

### Using External PostgreSQL

To use an external PostgreSQL database instead of PGlite:

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/postiz"
```

## Architecture

```
apps/desktop/
├── src-tauri/           # Tauri/Rust native app
│   ├── tauri.conf.json  # Window config, CSP, bundling
│   ├── icons/           # macOS app icons (.icns, iconset)
│   └── src/main.rs      # Rust entry point
├── src/
│   ├── main.ts          # Service orchestration
│   └── service-manager.ts  # Process lifecycle
└── package.json
```

Services started by desktop mode:

1. **Temporal** (port 7233) - Workflow orchestration
2. **Backend** (port 3000) - NestJS API
3. **Frontend** (port 4200) - Next.js UI
4. **Orchestrator** - Temporal worker

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `cargo: command not found` | Install Rust (see Prerequisites) |
| `tauri: command not found` | Run `cargo install tauri-cli` |
| Window is blank | Ensure services are running (`pnpm run desktop:start`) |
| Port already in use | Kill existing processes: `lsof -ti:3000,4200,7233 \| xargs kill` |

## License

[AGPL-3.0](../../LICENSE)
