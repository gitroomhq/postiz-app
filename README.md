# Town Crier

Town Crier is a self-hosted social media scheduling workspace for the Story.Page platform.

## Status

This repository is maintained as a product fork.
Production deployments are pinned to release branches (for example, `deploy/v2.19.0`).

## Stack

- Next.js frontend
- NestJS API
- Workers and cron services
- PostgreSQL
- Redis

## Quick Start

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Start local services:
   ```bash
   docker compose -f docker-compose.dev.yaml up -d
   ```
4. Start development services:
   ```bash
   pnpm dev
   ```

## Deployment

- Keep `main` for upstream sync.
- Deploy from a pinned release branch (for example, `deploy/v2.19.0`).
- Promote only after smoke testing frontend, backend, workers, and scheduled jobs.

## License

This repository is licensed under [AGPL-3.0](LICENSE).