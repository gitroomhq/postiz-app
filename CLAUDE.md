This project is Vocaccio, a growth/CRM/content hub built as a fork of Postiz
(social/chat post scheduling to 28+ channels). Vocaccio adds CRM, Religare
(astrology/HD readings for experts), Volatis (carousel engine), per-client
channels, and multi-tenant org/RBAC on top of the inherited Postiz core.
Postiz's own product features (Schedule posts, Calendar view, Analytics, Team
management, Media library) still ship — they're the substrate Vocaccio is built on.

This project is a monorepo with a root only package.json of dependencies.
Made with PNPM.
We have 3 important folders

- apps/backend - this is where the API code is (NESTJS)
- apps/orchestrator - this is temporal, it's for background jobs (NESTJS) it contains all the workflows and activities
- apps/frontend - this is the code of the frontend (Next.js ReactJS, App Router)
- /libraries contains a lot of services shared between backend and orchestrator and frontend components.

`apps/extension`, `apps/sdk`, `apps/commands` are inherited Postiz apps not part
of the Vocaccio product — don't build features there. Some Postiz routes/menu
items (`agents`, `plugs`, `third-party`) are quarantined (hidden behind
`NEXT_PUBLIC_VOC_LEGACY_MODULES`, default off) — see
`docs/auditoria/plano-leveza-2026-07.md` before touching them or their deps.

**Leveza & estabilidade:** the codebase inherited real weight/instability from
Postiz (heavy deps never used by the product, watcher loops, etc.). The active
remediation plan is `docs/auditoria/plano-leveza-2026-07.md` — read it before
removing dependencies or modules. Golden rule for any dependency/module removal:
**grep for imports across the whole monorepo → `pnpm install` + full build →
real boot (curl) → isolated commit.** Never skip the grep or the boot check,
and never hand-edit `pnpm-lock.yaml` without running `pnpm install` to
regenerate it (a stale lockfile breaks `--frozen-lockfile` CI).

We are using only pnpm, don't use any other dependency manager.
Never install frontend components from npmjs, focus on writing native components.

The project uses tailwind 3, before writing any component look at:
- /apps/frontend/src/app/colors.scss
- /apps/frontend/src/app/global.scss
- /apps/frontend/tailwind.config.js

All the --color-custom* are deprecated, don't use them.

And check other components in the system before to get the right design.

When working on the backend we need to pass the 3 layers:
Controller >> Service >> Repository (no shortcuts)
In some cases we will have
Controller >> Mananger >> Service >> Repository.

Most of the server logic should be inside of libs/server.
The backend repository is mostly used to write controller, and import files from libs.server.

For the frontend follow this:
- Many of the UI components lives in /apps/frontend/src/components/ui
- Routing is in /apps/frontend/src/app
- Components are in /apps/frontend/src/components
- always use SWR to fetch stuff, and use "useFetch" hook from /libraries/helpers/src/utils/custom.fetch.tsx

When using SWR, each one have to be in a seperate hook and must comply with react-hooks/rules-of-hooks, never put eslint-disable-next-line on it.

It means that this is valid:
const useCommunity = () => {
   return useSWR....
}

This is not valid:
const useCommunity = () => {
  return {
    communities: () => useSWR<CommunitiesListResponse>("communities", getCommunities),
    providers: () => useSWR<ProvidersListResponse>("providers", getProviders),
  };
}

- Linting of the project can run only from the root.
- Use only pnpm.
- The system is in production with many users, if you want to change something, you need to be sure that you are not breaking anything for existing users and a migration might be needed