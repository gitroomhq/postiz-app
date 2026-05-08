# SocialStream — AGPL-3.0 fork of Postiz

This repository is a public AGPL-3.0 fork of [Postiz](https://github.com/gitroomhq/postiz-app),
maintained by [SocialStream](https://socialstream.be) — a managed social-media
scheduling service for Belgian SMEs and agencies.

## Why this fork exists

AGPL-3.0 obliges any operator of a network-modified version to publish their
modifications. SocialStream modifies Postiz (license footer, `/health` endpoint,
`/source` redirect, `BUILD_COMMIT_SHA` bake) and operates the result as a
managed service hosted in Germany (Frankfurt + Nuremberg). This public fork
is how we satisfy that obligation. Every modification is committed here within
30 days of going live in production.

| | |
|---|---|
| **Live service** | [`app.socialstream.be`](https://app.socialstream.be) — login + main app shell carry the AGPL footer with a link back here |
| **Source-code transparency** | [`app.socialstream.be/source`](https://app.socialstream.be/source) → 302 redirect to the exact commit running in production |
| **Pinned upstream tag** | `v2.21.7` — bumped monthly via [`upstream-merge.yml`](.github/workflows/upstream-merge.yml) Action |
| **Modification markers** | every touched upstream file carries a `// Modified by SocialStream on YYYY-MM-DD` comment |
| **Drift gate** | every deploy is blocked by [`agpl-drift-check.yml`](.github/workflows/agpl-drift-check.yml) Action — fork must contain the production commit and be ≤30 days behind production |

## Where to go

- **Customer of `app.socialstream.be`?** Email `hello@socialstream.be`.
- **Want to use or contribute to the underlying product?** Go to the
  upstream project at [`gitroomhq/postiz-app`](https://github.com/gitroomhq/postiz-app)
  — that's the right place for product features, bugs, and self-hosted
  installation help. We don't accept external contributions on this fork
  (see [`CONTRIBUTING.md`](./CONTRIBUTING.md)).
- **Found a security issue?** See [`SECURITY.md`](./SECURITY.md).
- **Want to read upstream's README?** See [`UPSTREAM_README.md`](./UPSTREAM_README.md)
  — preserved verbatim from the upstream project.

## License

AGPL-3.0, unchanged from upstream — see [`LICENSE`](./LICENSE).
