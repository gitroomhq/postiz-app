<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/frontend/public/logo-text-dark.svg">
    <img alt="Postmonster logo" src="apps/frontend/public/logo-text.svg" width="280"/>
  </picture>
</p>

<p align="center">
  <strong>Feed the feed.</strong><br/>
  Plan, schedule and publish to every network from one calm calendar.
</p>

<p align="center">
<a href="https://opensource.org/license/agpl-v3">
  <img src="https://img.shields.io/badge/License-AGPL%203.0-blue.svg" alt="License">
</a>
</p>

## Postmonster

Postmonster is an early-access social media scheduler for creators and small
teams. Connect your channels, plan content in a calendar, and publish to every
network from one place.

- **Calendar-first planning** — day, week, month and list views with drag & drop.
- **One composer, every network** — per-channel customization and previews.
- **Media library** — upload once, reuse everywhere.
- **Public API and MCP** — automate posting from your own tools.

Registration is invite-only while we are in early access: we onboard in small
batches to keep quality high.

## Open source

Postmonster is a modified version of [Postiz](https://github.com/gitroomhq/postiz-app)
by Gitroom, licensed under AGPL-3.0. The source code of this modified version
is published at [fiveppm/postm](https://github.com/fiveppm/postm); see
[NOTICE.md](NOTICE.md) for the list of modifications.

If you interact with a hosted instance over a network, AGPL-3.0 gives you the
right to receive the corresponding source code. Use the **Source code** link in
the application settings, or open the repository above.

## Development

```bash
# infrastructure: Postgres, Redis, Temporal
docker compose -f docker-compose.dev.yaml up -d postiz-postgres postiz-redis temporal-elasticsearch temporal-postgresql temporal

# install + schema
pnpm install
pnpm run prisma-db-push

# run backend (:3000), frontend (:4200), orchestrator
pnpm run dev
```

Node.js `>=22.12 <23` and pnpm (see `packageManager` in `package.json`) are
required. For local http development set `NOT_SECURED=true` in `.env`.

## License

AGPL-3.0. See [LICENSE](LICENSE). Upstream Postiz retains its copyright;
see [NOTICE.md](NOTICE.md).
