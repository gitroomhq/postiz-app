# Claude context — SocialStream's AGPL-3.0 fork of Postiz

This repository is a public fork of [Postiz](https://github.com/gitroomhq/postiz-app)
maintained by [SocialStream](https://socialstream.be), a Belgian-managed social
media scheduling service. The fork exists to satisfy AGPL-3.0 § 5 (operators of
network-modified versions must publish their modifications).

If you're a Claude instance working in this repo, read this file before editing.

## What this fork is for

- We run Postiz as a managed service at [`app.socialstream.be`](https://app.socialstream.be).
- AGPL-3.0 obliges us to publish every modification within 30 days of going live.
- This repo is the public mirror of what's running in production.
- Operations docs, runbooks, planning, and infra-as-code live in the **separate**
  private repo [`socialstream-ops`](https://github.com/SocialStream-SaaS/socialstream-ops),
  not here.

## Modification rules

1. **Every touched upstream file** must carry a `// Modified by SocialStream on YYYY-MM-DD`
   comment marker.
2. **Net-new SocialStream-only files** are tagged with the same marker at the top.
3. The pinned upstream tag (`v2.21.7` as of 2026-05-08) is bumped monthly via
   [`.github/workflows/upstream-merge.yml`](.github/workflows/upstream-merge.yml).
4. Every deploy is gated by [`.github/workflows/agpl-drift-check.yml`](.github/workflows/agpl-drift-check.yml):
   the production commit must be present on this fork and the fork must be ≤30 days
   behind production.
5. The `LICENSE` file is upstream's AGPL-3.0 — never modify.
6. The license-footer component (`apps/frontend/src/components/license-footer.tsx`)
   is the AGPL § 5 attribution surface — preserve the upstream "Postiz" link there.

## Stack quick-reference

- Monorepo with `pnpm` workspaces, NX-managed.
- `apps/backend` — NestJS API
- `apps/orchestrator` — Temporal workflows + activities
- `apps/frontend` — Next.js (App Router)
- `libraries/` — shared NestJS + React modules. Prisma schema lives in
  `libraries/nestjs-libraries/src/database/prisma/schema.prisma`.
- Node 20.17.x, pnpm 8+, Postgres + Redis required, Resend for email.
- Tailwind 3 — before writing components, look at
  `apps/frontend/src/app/colors.scss`, `global.scss`, and `tailwind.config.js`.
  All `--color-custom*` tokens are deprecated; don't use them.

## Backend conventions (kept from upstream)

- Controller → Service → Repository (no shortcuts). Sometimes a Manager layer
  sits between controller and service for orchestration.
- Most server logic lives in `libraries/`; controllers in `apps/backend/` are
  thin and just import from libs.

## Frontend conventions (kept from upstream)

- UI primitives in `apps/frontend/src/components/ui`.
- Routing in `apps/frontend/src/app`.
- Components in `apps/frontend/src/components`.
- Always use SWR for fetching, with the `useFetch` hook from
  `libraries/helpers/src/utils/custom.fetch.tsx`.
- Each SWR hook must comply with `react-hooks/rules-of-hooks` — never use
  `eslint-disable-next-line` to bypass it. Each fetch belongs in its own hook.

## Branding

The upstream code historically called the product "Postiz" or "Gitroom". The
SocialStream brand retrofit (PR #4, merged 2026-05-08) replaced customer-visible
"Postiz" mentions across page titles, logos, public assets, and email templates
with "SocialStream", and replaced the favicon/logo SVG/PNG assets in
`apps/frontend/public/`. Future modifications must keep customer surfaces
SocialStream-branded.

The single deliberate exception is `apps/frontend/src/components/license-footer.tsx`,
which carries the AGPL § 5 attribution back to upstream Postiz — that link must stay.

## Contributions

This is an operator-fork, not an open-source product. We do **not** accept
external pull requests here. Contributions to the underlying product belong
upstream: [`gitroomhq/postiz-app`](https://github.com/gitroomhq/postiz-app).

For SocialStream-specific operational issues, contact `hello@socialstream.be`.
