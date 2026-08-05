This project is PostQueen, a tool to schedule social media and chat posts to 28+ channels.
You can add posts to the calendar, they will be added into a workflow and posted at the right time.
You can find things like:
- Schedule posts
- Calendar view
- Analytics
- Team management
- Media library

This project is a monorepo with a root only package.json of dependencies.
Made with PNPM.
We have 3 important folders

- apps/backend - this is where the API code is (NESTJS)
- apps/orchestrator - this is temporal, it's for background jobs (NESTJS) it contains all the workflows and activities
- apps/frontend - this is the code of the frontend (Next.js App Router, ReactJS)
- /libraries contains a lot of services shared between backend and orchestrator and frontend components.

We are using only pnpm, don't use any other dependency manager.
Never install frontend components from npmjs, focus on writing native components.

The project uses tailwind 3, before writing any component look at:
- /apps/frontend/src/app/colors.scss
- /apps/frontend/src/app/global.scss
- /apps/frontend/tailwind.config.cjs

All the --color-custom* are deprecated, don't use them.

And check other components in the system before to get the right design.

When working on the backend we need to pass the 3 layers:
DTO >> Controller >> Service >> Repository (no shortcuts)
In some cases we will have
DTO >> Controller >> Manager >> Service >> Repository.

Most of the server logic should be inside of libs/server.
The backend repository is mostly used to write controller, and import files from libs.server.

For the frontend follow this:
- Many of the UI components lives in /apps/frontend/src/components/ui
- Routing is in /apps/frontend/src/app
- Components are in /apps/frontend/src/components
- always use SWR to fetch stuff, and use "useFetch" hook from /libraries/helpers/src/utils/custom.fetch.tsx

When using SWR, each one have to be in a separate hook and must comply with react-hooks/rules-of-hooks, never put eslint-disable-next-line on it.

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
- Never use RAW SQL queries, always use Prisma.
- The system is in production with many users, if you want to change something, you need to be sure that you are not breaking anything for existing users and a migration might be needed
- Whenever you generate a PR, PR description, or similar, **always** follow the PR Template (.github/PULL_REQUEST_TEMPLATE.md)
- Avoid as much as possible creating new files with pure logic of algorithms, it's usually wrong
- When you write code, make sure that what you add looks like something similar somewhere else in the code, don't make weird patterns
- When you finished running, run another agents that matches the new code with the existing system code, to see that it looks similar and is not a weird pattern.
- Workflows files can never be changed if they are already in origin/main, because changing a workflow will fail all its activities, instead create a new workflow with the version, and everywhere the workflow being called, change it to the new workflow version.
- Workflows activities parameters cannot be changed, as it will break the workflow, if we need to change the parameters, if we need to change the parameters, we need to create a new activity with the new parameters, and then create a new workflow that uses the new activity.
- Code must always be generic, there can't be a way that a specific logic, let's say facebook or instagram, appear in a file that use a generic logic, instead, we need to edit the interface of the provider, add another function, and then generically call it from the generic code, and then implement the specific logic in the provider implementation. we can't have something like if(facebookProvider) {} inside a non facebook provider file.

# UI migration (in progress)

A visual redesign of `apps/frontend` is being applied step by step. The reference lives in
`design/handoff/`. Read `design/handoff/README.md` before touching frontend code.

**It is git-ignored on purpose** — this repository is public and the handoff contains an unreleased
design and unannounced pricing. It is working material held locally; if it is missing from your
checkout, ask for it rather than guessing. `docs/ui-migration-log.md` is the part that ships.

## The rule

**The design is authoritative on how it LOOKS. This repo is authoritative on how it WORKS.**

Take colour, spacing, type, layout, motion and element inventory from the design. Take behaviour,
strings, routing, validation, API calls and feature-gate conditions from the code. When the design
implies behaviour the code doesn't have, **raise it — do not implement it silently.**

## Non-negotiables

- `design/handoff/design/PostQueen App v2.dc.html` is a prototype, not production code. **Never copy
  its HTML.** Reproduce it with this repo's components, stores and Tailwind setup.
- **It is ~800 KB — never read it whole.** Grep the named `*Vals()` method and read only that region
  plus its template block. Method index is in `design/handoff/README.md`.
- **The prototype outranks the handoff's own markdown docs.** Those docs are stale in ~20 places;
  the corrections table is in `docs/ui-migration-log.md`. Read the method, not the doc.
- All colour comes from the token layer in `apps/frontend/src/app/colors.scss`. No hex literals in
  components. Missing value → add a token.
- Do not rewrite handlers, API calls or provider settings while restyling. Those were verified
  against source; "cleaning them up" is a regression. **Copy: visible labels and headings take the
  design's text** (owner decision, 2026-08-05 fidelity pass) as `t()` keys with English fallbacks;
  error/validation strings stay the repo's.
- **Never make a capability unreachable just because the design doesn't show it — but the rail
  matches the design's inventory exactly** (owner decision, 2026-08-05). Plugs and Affiliate live
  as link rows in the Settings sub-nav (`extraMenu` in `top.menu.tsx`); Create Post stays in the
  header slot.
- Keep **i18n** (14 languages) and **RTL** (he, ar) working. The prototype has neither — it is
  hardcoded English, LTR only.
- Theming is a **`.dark` / `.light` class on `<body>`** (`darkMode: 'class'`), not `data-theme` on
  `<html>`. There are zero `dark:` utilities — everything flows through those two blocks.
- Responsive structure keys off `[data-mobile="1"]` / `[data-tablet="1"]` on the app root
  (mobile <760, tablet 760–1179, desktop ≥1180). Do **not** change the Tailwind `mobile:`/`tablet:`
  breakpoints — 88 call sites depend on them.
- The 1px hairlines between a page's own columns are drawn by `gap-[1px]` over a
  `bg-newBgLineColor` parent. The design uses the identical trick. Do not replace it.

## Every step must prove it broke nothing

Run all four before opening a PR, and record the results in `docs/ui-migration-log.md`:

```
scripts/ui-migration-check.sh
```

Types clean, the API-path list unchanged, the i18n key list unchanged, the route list unchanged.
Then screenshot the screen at 420 / 900 / 1440 in both themes and compare against the prototype
served from `design/handoff/design/`.

## Order of work

`docs/ui-migration-log.md` tracks which step is done. Tokens land first, shell second. Do not start
a screen step before both are merged. 