# Frontend

Next.js App Router UI for PostQueen. It lives in this pnpm workspace.

From the repository root:

```bash
pnpm --filter ./apps/frontend dev
```

Then open [http://localhost:4200](http://localhost:4200). The `dev` and `start`
scripts bind to port **4200**. The Docker self-host UI is
[http://localhost:4007](http://localhost:4007).

App routes live under `src/app`. Shared UI is in `src/components`.

See the [root README](../../README.md) and
[local development](https://docs.postqueen.ai/installation/development).
