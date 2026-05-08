# Contributing

This repository is SocialStream's public AGPL-3.0 fork of [Postiz](https://github.com/gitroomhq/postiz-app).
It exists to publish the modifications we run in production at
[`app.socialstream.be`](https://app.socialstream.be), as the AGPL-3.0
license requires of network-modified versions.

It is **not** a community fork or alternative distribution.

## We do not accept external contributions

Pull requests and feature requests opened against this repository will be
closed without review. This is not a slight on contributors — it's a scope
decision: SocialStream is one operator publishing its modifications, and we
don't have the capacity to maintain external code in this fork.

## Where to contribute instead

- **Want to improve the underlying product?** Open issues and PRs on the
  upstream project: [`gitroomhq/postiz-app`](https://github.com/gitroomhq/postiz-app).
  Their [contributing guide](https://github.com/gitroomhq/postiz-app/blob/main/CONTRIBUTING.md)
  explains the process.
- **Found a problem with the SocialStream-managed service?** Email
  `hello@socialstream.be`.
- **Found a security issue?** See [`SECURITY.md`](./SECURITY.md).

## What lives here

- The pinned upstream Postiz codebase, plus the SocialStream-specific
  modifications described in [`CLAUDE.md`](./CLAUDE.md).
- AGPL drift-check and monthly upstream-merge workflows in
  [`.github/workflows/`](./.github/workflows/).
- The `LICENSE` file (AGPL-3.0, unchanged from upstream).

Operations runbooks, infrastructure code, and planning live in the separate
private repository
[`socialstream-ops`](https://github.com/SocialStream-SaaS/socialstream-ops).
