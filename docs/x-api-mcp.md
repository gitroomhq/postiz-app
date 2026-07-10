> ## Documentation Index
> Fetch the complete documentation index at: https://docs.x.com/llms.txt
> Use this file to discover all available pages before exploring further.

# MCP servers for the X API and X developer docs

> Connect Grok, Cursor, and other AI tools to the X API and X developer docs through hosted Model Context Protocol servers using xurl and docs search.

Two [MCP](https://modelcontextprotocol.io) (Model Context Protocol) servers are available for working with X from AI tools:

| Server       | What it does                                                                                    | URL                                                      |
| :----------- | :---------------------------------------------------------------------------------------------- | :------------------------------------------------------- |
| **X MCP**    | Call X API endpoints (search posts, look up users, bookmarks, trends, news, Articles, and more) | `https://api.x.com/mcp` (hosted; connect via `xurl mcp`) |
| **Docs MCP** | Search and read X API documentation                                                             | `https://docs.x.com/mcp` (hosted)                        |

> **Reference:** https://x.com/athcanft/status/2067571218333753385

---

## X MCP — X API

Connect any MCP-compatible AI tool (Grok Build, Cursor, Claude, VS Code, and others) directly to the **X API**. The model can then search the full archive, look up users, manage bookmarks, fetch trends and news, and draft Articles — all with your own X account's permissions.

The X API exposes a hosted **Streamable HTTP** MCP server at **`https://api.x.com/mcp`** (protocol `2025-06-18`, `serverInfo: xmcp`). You reach it through the open-source **`xurl mcp`** bridge, which handles OAuth for you and injects a fresh Bearer token on every call.

### Capabilities at a glance

| Category          | What the model can do                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------- |
| **Posts**         | Fetch posts, see likers / reposters / quoters, recent counts                                  |
| **Search**        | Full-archive post search, user search, news search                                            |
| **Users**         | Resolve the current user, look up by id / handle, read a user's posts, timeline, and mentions |
| **Bookmarks**     | List / add / remove bookmarks and manage bookmark folders                                     |
| **News & Trends** | Get news stories, get trends for a location (WOEID)                                            |
| **Articles**      | Create draft Articles and publish them                                                        |

### How it works

X's OAuth requires *your own* developer app. There is no dynamic client registration, and `api.x.com/mcp` does not advertise native MCP OAuth discovery. Instead of pointing your client at the URL directly, you run a tiny local bridge. The bridge owns the app identity, performs the one-time login, and keeps the token fresh.

```mermaid
flowchart LR
    A["MCP client<br/>(Grok Build, Cursor, …)"] -- "stdio JSON-RPC" --> B["xurl mcp<br/>(local bridge)"]
    B -- "HTTPS + Authorization: Bearer" --> C[("api.x.com/mcp")]
    B <-- "OAuth2 PKCE login + auto-refresh" --> D["X OAuth"]
```

* The bridge runs via the **npm launcher** (`npx`), so there is **no separate install step**.
* On **first run with no cached token**, it opens your browser for a one-time OAuth2 login, then caches and **auto-refreshes** the token forever after.
* All diagnostics go to **stderr**; **stdout stays a clean JSON-RPC channel**.

### Getting started

Pick one of two routes:

* **Simple — App-only Bearer.** Paste your app's Bearer token into an `Authorization` header on the MCP client. No bridge, no browser login. Read-only endpoints; no user context (can't act as you). Works with clients that support remote MCP with custom headers.
* **Full — `xurl mcp` bridge (OAuth 2.0 user context).** A local bridge handles the OAuth 2.0 PKCE login and auto-refreshes tokens, so the model acts with your account's scopes. Required for writes (bookmarks, Articles) and any user-context tool.

#### Simple route (app-only Bearer)

1. **Create an X app** in the [X Developer Portal](https://developer.x.com).
2. **Copy your App-only Bearer token** from the app's "Keys and tokens" page.
3. Point your client at `https://api.x.com/mcp` with the token as an `Authorization` header — see [App-only (direct URL, no bridge)](#app-only-direct-url-no-bridge) below for the snippet.

#### Full route (xurl bridge)

1. **Create an X app** with **OAuth 2.0** enabled.
2. **Register the redirect URI** `http://localhost:8080/callback` on the app (required for the first-run browser login). To use a different one, set `REDIRECT_URI` and register that instead.
3. **Copy your `CLIENT_ID` and `CLIENT_SECRET`** — you'll put them in the client config. If you ever run `xurl auth oauth2` manually (e.g., the headless flow below), export them as environment variables in that shell first — the login fails in the browser without them.
4. **Have Node.js installed** (for `npx`).
5. We recommend you **install [xurl](https://github.com/xdevplatform/xurl)**:

   ```bash
   brew install --cask xdevplatform/tap/xurl      # Homebrew
   npm install -g @xdevplatform/xurl              # npm (global)
   curl -fsSL https://raw.githubusercontent.com/xdevplatform/xurl/main/install.sh | bash
   ```

> **First login needs a browser.** On a headless/remote box, authenticate out-of-band first with `xurl auth oauth2 --headless` (paste-a-code flow), then the bridge just reuses the cached token. See [Headless](#headless--remote-machines).

### Connect your client

#### 1. Grok Build

xurl bridge (`~/.grok/config.toml`):

```toml
[mcp_servers.xapi]
command = "npx"
args = ["-y", "@xdevplatform/xurl", "mcp", "https://api.x.com/mcp"]
enabled = true
startup_timeout_sec = 300          # give the first-run browser login time

[mcp_servers.xapi.env]
CLIENT_ID = "YOUR_X_APP_CLIENT_ID"
CLIENT_SECRET = "YOUR_X_APP_CLIENT_SECRET"
```

App-only Bearer (`~/.grok/config.toml`):

```toml
[mcp_servers.xapi]
url = "https://api.x.com/mcp"
enabled = true

[mcp_servers.xapi.headers]
Authorization = "Bearer YOUR_APP_ONLY_BEARER_TOKEN"
```

Or add the xurl bridge with one command (the `-e` flags become the server's environment, args after `--` go to `npx`):

```bash
grok mcp add xapi npx \
  -e CLIENT_ID=YOUR_X_APP_CLIENT_ID \
  -e CLIENT_SECRET=YOUR_X_APP_CLIENT_SECRET \
  -- -y @xdevplatform/xurl mcp https://api.x.com/mcp
```

Verify and list:

```bash
grok mcp doctor xapi      # ✓ server started, ✓ handshake OK, ✓ tools discovered
grok mcp list
```

The first time a tool is invoked (or on `doctor`), your browser opens for the X login — complete it once and you're set.

#### 2. Cursor

Create `~/.cursor/mcp.json` (global, all projects) or `.cursor/mcp.json` (this project only):

xurl bridge:

```json
{
  "mcpServers": {
    "xapi": {
      "command": "npx",
      "args": ["-y", "@xdevplatform/xurl", "mcp", "https://api.x.com/mcp"],
      "env": {
        "CLIENT_ID": "YOUR_X_APP_CLIENT_ID",
        "CLIENT_SECRET": "YOUR_X_APP_CLIENT_SECRET"
      }
    }
  }
}
```

App-only Bearer:

```json
{
  "mcpServers": {
    "xapi": {
      "url": "https://api.x.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_APP_ONLY_BEARER_TOKEN"
      }
    }
  }
}
```

Then open **Cursor → Settings → MCP**, confirm **xapi** shows a green dot and its tools. On first use Cursor spawns the bridge and your browser opens for login; the tool list populates once the handshake completes.

#### 3. Claude Desktop

Edit `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`):

xurl bridge:

```json
{
  "mcpServers": {
    "xapi": {
      "command": "npx",
      "args": ["-y", "@xdevplatform/xurl", "mcp", "https://api.x.com/mcp"],
      "env": { "CLIENT_ID": "YOUR_X_APP_CLIENT_ID", "CLIENT_SECRET": "YOUR_X_APP_CLIENT_SECRET" }
    }
  }
}
```

App-only Bearer:

```json
{
  "mcpServers": {
    "xapi": {
      "url": "https://api.x.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_APP_ONLY_BEARER_TOKEN" }
    }
  }
}
```

Restart Claude Desktop; the X tools appear in the tools (🔌) menu.

#### 4. VS Code (GitHub Copilot / Agent mode)

Add to `.vscode/mcp.json`:

xurl bridge:

```json
{
  "servers": {
    "xapi": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@xdevplatform/xurl", "mcp", "https://api.x.com/mcp"],
      "env": { "CLIENT_ID": "YOUR_X_APP_CLIENT_ID", "CLIENT_SECRET": "YOUR_X_APP_CLIENT_SECRET" }
    }
  }
}
```

App-only Bearer:

```json
{
  "servers": {
    "xapi": {
      "type": "http",
      "url": "https://api.x.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_APP_ONLY_BEARER_TOKEN" }
    }
  }
}
```

#### 5. Any MCP client

**xurl bridge (stdio):**

| Field           | Value                                                          |
| --------------- | -------------------------------------------------------------- |
| `command`       | `npx`                                                          |
| `args`          | `["-y", "@xdevplatform/xurl", "mcp", "https://api.x.com/mcp"]` |
| `env`           | `CLIENT_ID`, `CLIENT_SECRET`                                   |
| startup timeout | **≥ 300s** (so the first-run login can finish)                 |

If you installed `xurl` natively, replace `command`/`args` with `"command": "xurl", "args": ["mcp", "https://api.x.com/mcp"]`.

**App-only Bearer (remote HTTP):**

| Field                   | Value                               |
| ----------------------- | ----------------------------------- |
| `url`                   | `https://api.x.com/mcp`             |
| `headers.Authorization` | `Bearer YOUR_APP_ONLY_BEARER_TOKEN` |

### Authentication

#### OAuth 2.0 user context (default)

The bridge authenticates as **you** (PKCE flow), so tools act with your account's scopes. Resolution order for credentials: **`CLIENT_ID`/`CLIENT_SECRET` env vars → the active app in `~/.xurl`**. The bridge caches tokens in `~/.xurl` and refreshes them automatically (including a forced refresh after a `401`).

#### First-run browser login

With no cached token, the bridge prints to stderr and opens your browser:

```
[xurl mcp] no valid OAuth2 token; opening the browser to sign in -- complete the login to start the bridge...
[xurl mcp] authentication complete; starting bridge
```

The MCP handshake is held until you finish — that's why clients need a generous `startup_timeout_sec`.

#### Headless / remote machines

No reachable browser? Authenticate once out-of-band, then start the client:

```bash
# Required: the env block in your client config only applies to the bridge,
# not to manual xurl runs — export the credentials in this shell first.
export CLIENT_ID="YOUR_X_APP_CLIENT_ID"
export CLIENT_SECRET="YOUR_X_APP_CLIENT_SECRET"

xurl auth oauth2 --headless                 # prints an auth URL; you paste back the redirect URL/code
xurl auth oauth2 --app my-app --headless    # for a specific app
```

#### App-only (direct URL, no bridge)

For read endpoints, you can skip the bridge and point a client straight at the URL with a **static App-only Bearer token**. This is useful for clients that support remote MCP with custom headers:

```toml
# ~/.grok/config.toml
[mcp_servers.xapi_direct]
url = "https://api.x.com/mcp"
enabled = true

[mcp_servers.xapi_direct.headers]
Authorization = "Bearer YOUR_APP_ONLY_BEARER_TOKEN"
```

Trade-off: no auto-refresh and no user context (no actions as you). The bridge is recommended for full functionality.

#### Multiple apps & accounts

> The OAuth login authorizes **whichever X account is logged in when the browser opens** — not necessarily the account that owns the app. If you're posting on behalf of a secondary/bot account, switch to that account in your browser before completing the login (or use `-u` to pick a previously authorized user).

```bash
xurl --app my-app mcp                  # bridge using a specific registered app
xurl mcp -u alice https://api.x.com/mcp  # act as a specific OAuth2 user
```

In a client config, add `"--app", "my-app"` or `"-u", "alice"` to `args`.

### Configuration reference

| Setting                       | Where         | Notes                                                                                           |
| ----------------------------- | ------------- | ----------------------------------------------------------------------------------------------- |
| `CLIENT_ID` / `CLIENT_SECRET` | `env`         | Your X app credentials (or rely on a registered app in `~/.xurl`)                               |
| `REDIRECT_URI`                | `env`         | Overrides the callback; must be registered on the app. Default `http://localhost:8080/callback` |
| `startup_timeout_sec`         | client config | Set **≥ 300** so first-run login can complete                                                   |
| `[URL]` positional            | `args`        | Defaults to `https://api.x.com/mcp`                                                             |
| `--app NAME`                  | `args`        | Use a specific registered app                                                                   |
| `-u, --username`              | `args`        | Act as a specific OAuth2 user                                                                   |

Advanced env overrides (rarely needed): `AUTH_URL`, `TOKEN_URL`, `API_BASE_URL`, `INFO_URL`.

### Verify & troubleshoot

```bash
grok mcp doctor xapi          # Grok Build: end-to-end check
# or test the bridge by hand (Ctrl-C to exit):
npx -y @xdevplatform/xurl mcp https://api.x.com/mcp
```

| Symptom                                                                           | Cause / Fix                                                                                                                                                             |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client times out on startup                                                       | Raise `startup_timeout_sec` to 300+; the bridge is waiting on your browser login                                                                                        |
| Browser never opens                                                               | No display (headless) → run `xurl auth oauth2 --headless` first; ensure `npx` resolves                                                                                  |
| `401` / `token refresh failed`                                                    | App credentials wrong, or refresh token revoked → re-run the login (`xurl auth oauth2 [--app NAME]`)                                                                    |
| Browser shows "Something went wrong — You weren't able to give access to the App" | `CLIENT_ID`/`CLIENT_SECRET` not set where `xurl` runs → put them in the client's `env` block, or `export` them in your shell before running `xurl auth oauth2` manually |
| Redirect/callback error in browser                                                | `http://localhost:8080/callback` not registered on the app (or `REDIRECT_URI` mismatch)                                                                                 |
| `client-not-enrolled` after login                                                 | App isn't in the right X package/environment → in the portal move it to **Pay-per-use** + **Production**                                                                |
| `npx` pulls a stale version                                                       | A private registry mirror is default → pin `--registry=https://registry.npmjs.org/` in `args`                                                                           |
| Empty/garbled tool output                                                         | Don't run the client with `--verbose`; stdout must stay a clean JSON-RPC channel                                                                                        |

### Security & best practices

* **Treat `~/.xurl` and access tokens as secrets** — don't paste them into chats, logs, or shared configs. Prefer per-project `.mcp.json`/`.grok/config.toml` that reference env vars over committing raw secrets.
* **Use a dedicated app** for MCP with only the scopes you need.
* **Writes count against rate limits** (bookmarks, `article_publish`) and are stricter than reads; expect occasional `429`s and back off.
* **The bridge is local** — your credentials never leave your machine except as a Bearer token sent over TLS to `api.x.com`.

---

## Docs MCP — documentation search

X hosts an MCP server for the X API documentation at `https://docs.x.com/mcp`. Connect it to your AI tool to search and read documentation pages without leaving your workflow.

### Available tools

| Tool         | Description                                                                                           |
| :----------- | :---------------------------------------------------------------------------------------------------- |
| `search_x`   | Search across the X documentation for relevant information, code examples, API references, and guides |
| `get_page_x` | Retrieve the full content of a specific documentation page by its path                                |

### Configuration

Add the docs MCP server to your MCP client configuration:

```json
{
  "mcpServers": {
    "x-docs": {
      "url": "https://docs.x.com/mcp"
    }
  }
}
```

This is useful when you're building with the X API and want your AI assistant to look up endpoint details, authentication guides, or code examples on the fly.

---

## Using both servers together

You can connect both MCP servers simultaneously. This gives your AI assistant the ability to both look up documentation *and* call the API.

**Grok Build** (`~/.grok/config.toml`):

```toml
[mcp_servers.xapi]
command = "npx"
args = ["-y", "@xdevplatform/xurl", "mcp", "https://api.x.com/mcp"]
enabled = true
startup_timeout_sec = 300

[mcp_servers.xapi.env]
CLIENT_ID = "YOUR_X_APP_CLIENT_ID"
CLIENT_SECRET = "YOUR_X_APP_CLIENT_SECRET"

[mcp_servers.x-docs]
url = "https://docs.x.com/mcp"
enabled = true
```

**Cursor / Claude-style** (`mcp.json`):

```json
{
  "mcpServers": {
    "xapi": {
      "command": "npx",
      "args": ["-y", "@xdevplatform/xurl", "mcp", "https://api.x.com/mcp"],
      "env": {
        "CLIENT_ID": "YOUR_X_APP_CLIENT_ID",
        "CLIENT_SECRET": "YOUR_X_APP_CLIENT_SECRET"
      }
    },
    "x-docs": {
      "url": "https://docs.x.com/mcp"
    }
  }
}
```

---

## OpenAPI specification

The machine-readable API specification for all X API v2 endpoints.

| Resource                | URL                                                                    |
| :---------------------- | :--------------------------------------------------------------------- |
| **OpenAPI Spec (JSON)** | [`https://api.x.com/2/openapi.json`](https://api.x.com/2/openapi.json) |

```bash
curl https://api.x.com/2/openapi.json -o openapi.json
```

You can use it to auto-generate API clients, import into [Postman](https://www.postman.com/xapidevelopers/x-api-public-workspace/collection/34902927-2efc5689-99c6-4ab6-8091-996f35c2fd80), feed into custom AI agents, or validate request/response schemas.
