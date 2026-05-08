# Security policy

This repository is SocialStream's public AGPL-3.0 fork of [Postiz](https://github.com/gitroomhq/postiz-app).
There are two categories of security issue and they go to different places.

## 1. Vulnerabilities in the underlying Postiz code

If the issue is in the upstream Postiz codebase (anything that would also
affect users running the official `gitroomhq/postiz-app` builds), please
report it upstream:

- [GitHub Security Advisories on `gitroomhq/postiz-app`](https://github.com/gitroomhq/postiz-app/security/advisories/new)

We track upstream security fixes via the monthly
[`upstream-merge.yml`](.github/workflows/upstream-merge.yml) workflow, and
roll critical patches faster on demand. There's no need to file the same
report against this fork.

## 2. Vulnerabilities specific to SocialStream's deployment

If the issue is specific to **how SocialStream runs Postiz** — for example
the managed service at `app.socialstream.be`, the AGPL-modified files
(license footer, `/health` endpoint, `/source` redirect, `BUILD_COMMIT_SHA`
bake), SocialStream-operated infrastructure, or the SocialStream-only
content on this repo — email:

- **`security@socialstream.be`**

### What to include

- A clear description of the issue and its impact.
- Reproduction steps or a proof-of-concept, if available.
- The commit SHA visible at `app.socialstream.be/source` when you observed the issue.
- Whether you'd like public credit when we publish the advisory.

### Our response

- We acknowledge receipt within 2 business days (Belgian time).
- We aim to publish a fix within 14 days for high-severity issues, sooner
  for critical ones.
- We coordinate with upstream Postiz when the underlying issue affects
  both projects.

## AI-generated reports

Reports that appear to be LLM-generated without meaningful human analysis —
typically lacking a working proof-of-concept, reproducible steps, or
accurate impact assessment — will be closed without detailed response.

Reports that include AI-assisted analysis are welcome provided they have
been validated by the reporter and include a proof-of-concept, reproduction
steps, and impact assessment.

## Out of scope

- Generic dependency vulnerability reports without a working exploit path.
- Issues in user-hosted / self-hosted Postiz deployments not operated by
  SocialStream — those go upstream.
- Social-engineering tests against SocialStream staff or customers.
