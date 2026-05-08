# AGENTS.md

> **Single source of truth for any AI agent working in this repo:** [`CLAUDE.md`](CLAUDE.md).

The root `CLAUDE.md` points to per-area child `CLAUDE.md` files
(`apps/backend`, `apps/frontend`, `apps/orchestrator`,
`libraries/nestjs-libraries` and its children `ai/`, `chat/`,
`integrations/social/`, and `libraries/react-shared-libraries`). Agents
should read the closest `CLAUDE.md` to the directory they are working in,
cascading up to the root.

All `CLAUDE.md` files in this repo are written in English (the agent
reads them better that way). Product-facing artifacts (CHANGELOG,
docs/, translations) stay in pt-BR per project convention.

Product and architecture documentation lives in [`docs/`](docs/),
referenced by the `CLAUDE.md` files but not the same thing.
