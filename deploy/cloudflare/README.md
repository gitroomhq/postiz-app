# Postiz on Cloudflare (self-hosted)

Runs the full Postiz stack on the Cloudflare Developer Platform: a Worker
fronts a single all-in-one Container, uploads/state are persisted to R2, and
every LLM call is routed through the account's **AI Gateway dynamic routes**.

```
                    ┌─────────────────────────────────────────────┐
 browser ──────────▶│ Worker "postiz"                             │
                    │  /__backup/*  ── R2 bucket postiz-backups   │
                    │  /__ai/v1/images/generations ── Workers AI  │
                    │       (env.AI.run + { gateway: { id } })    │
                    │  /*  ─────────┐                             │
                    │  cron */5 min │ keep-alive                  │
                    └───────────────┼─────────────────────────────┘
                                    ▼
                    ┌─────────────────────────────────────────────┐
                    │ Container (standard-2: 1 vCPU/6GiB/12GB)    │
                    │  nginx :5000                                │
                    │   ├─ /api/     → backend (NestJS :3000)     │
                    │   ├─ /uploads/ → local files                │
                    │   └─ /         → frontend (Next.js :4200)   │
                    │  orchestrator (Temporal worker :3002)       │
                    │  postgres 15 · redis (cache) ·              │
                    │  temporal dev server (SQLite)               │
                    │  backup loop → PUT /__backup/* every 5 min  │
                    └─────────────────────────────────────────────┘
                                    │ chat/completions
                                    ▼
        https://gateway.ai.cloudflare.com/v1/<acct>/x/compat
                       model: dynamic/text_gen
```

## AI Gateway routing

All text generation (OpenAI SDK, LangChain `ChatOpenAI`, CopilotKit, Mastra /
ai-sdk) goes through the gateway's OpenAI-compat endpoint with the
`dynamic/text_gen` route — configured centrally in
`libraries/nestjs-libraries/src/openai/ai.gateway.config.ts` and enabled by
`CF_AIG_TOKEN` + `CF_ACCOUNT_ID`. Without those env vars the app behaves like
stock Postiz (direct OpenAI), so the fork stays upstream-mergeable.

Image generation: the compat endpoint does not serve `images/generations`
(gateway error 2019), so the Worker exposes an OpenAI-images-shaped endpoint
at `/__ai/v1/images/generations` backed by
`env.AI.run(IMAGE_MODEL, { prompt }, { gateway: { id } })` — the sanctioned
Worker-side gateway pattern. Swap `IMAGE_MODEL` in `wrangler.jsonc` to any
Workers AI image model.

## Durability model (read this)

Cloudflare Containers have **ephemeral disk**. Durability comes from the
backup loop in `container/backup.sh`:

- Postgres `pg_dumpall` → `db-latest.sql.gz` every 5 min (+ 7-day daily ring)
- Temporal SQLite online-backup → `temporal-latest.db` every 5 min
- `/uploads` files → `uploads/<path>` incrementally

all PUT through the Worker into the `postiz-backups` R2 bucket (the container
holds no S3 credentials; `INTERNAL_SECRET` authenticates it to the Worker).
On a cold start the entrypoint restores all three before the app boots.

**RPO is ~5 minutes** (`BACKUP_INTERVAL_SECONDS` to tune). If the container
is evicted (deploy, host maintenance), in-flight changes since the last
backup are lost. Good enough for a personal instance; for stronger
guarantees, point `DATABASE_URL` (Worker secret) at a managed Postgres
(Neon/Supabase, ideally via Hyperdrive) and `TEMPORAL_ADDRESS` at Temporal
Cloud — the entrypoint then skips the in-container instances automatically.

A cron trigger pings the container every 5 minutes so it stays warm —
required for Temporal timers (scheduled posts) to fire and billed
accordingly (this is an always-on instance by design).

## Deploy

```bash
cd deploy/cloudflare

# one-time secrets
npx wrangler secret put JWT_SECRET       # any long random string
npx wrangler secret put CF_AIG_TOKEN     # AI Gateway authentication token
npx wrangler secret put INTERNAL_SECRET  # any long random string (container<->worker auth)

./deploy.sh
```

The container image builds **fully from source** inside Docker
(`container/Dockerfile`, build context = repo root) — node 22 bookworm-slim,
`pnpm install`, `pnpm run build`, mirroring the repo's own `Dockerfile.dev`,
plus Postgres/Redis/Temporal-CLI and the boot/backup scripts. (The published
`ghcr.io/gitroomhq/postiz-app` image is an older Alpine/Caddy packaging and
is not used.) The first build takes a while; later builds reuse the Docker
layer cache — source changes only re-run the `pnpm install`/`build` layers.

`vars.PUBLIC_URL` in `wrangler.jsonc` must match the deployed URL
(workers.dev or a custom domain); the frontend reads it at runtime, so
changing it only requires a redeploy, not an image rebuild.

First request after a cold start takes ~1–2 min (restore + boot); check
`npx wrangler tail` and the container logs in the dash if it seems stuck.

## Env contract (container)

Set by the Worker (`containerEnv()` in `worker/src/index.ts`):
`MAIN_URL`/`FRONTEND_URL`/`NEXT_PUBLIC_BACKEND_URL` (from `PUBLIC_URL`),
`JWT_SECRET`, `CF_ACCOUNT_ID`, `CF_GATEWAY_ID`, `CF_AIG_TOKEN`,
`AI_TEXT_MODEL`, `AI_IMAGE_BASE_URL`, `OPENAI_API_KEY` (= gateway token, for
feature gates), `BACKUP_URL`, `INTERNAL_SECRET`, optional `DATABASE_URL` /
`REDIS_URL` overrides. Everything else defaults in
`container/entrypoint.sh`. Social-network OAuth keys can be added to
`containerEnv()` as Worker secrets when needed.
