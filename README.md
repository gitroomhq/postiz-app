# Lime Manager

Internal social media scheduling tool, forked from [Postiz](https://github.com/gitroomhq/postiz-app) (AGPL-3.0) as a code skeleton.

This is an internal-use fork, not a public product. Upstream branding, marketing copy, and public-facing links have been stripped; upstream feature/functionality remains largely intact pending scoping.

## Stack

- `apps/backend` — API (NestJS)
- `apps/orchestrator` — background jobs / workflows (NestJS + Temporal)
- `apps/frontend` — web app (Vite/Next.js)
- `libraries/*` — shared code between backend/orchestrator/frontend

## Local development

See `docker-compose.dev.yaml` for the local infra (Postgres, Redis, Temporal, Elasticsearch). Copy `.env.example` to `.env` and fill in required values, then:

```bash
docker compose -f ./docker-compose.dev.yaml up -d
pnpm install
pnpm run dev
```

## License note

Upstream Postiz is AGPL-3.0. This fork stays internal-only for now; see `LICENSE` for the inherited license terms.
