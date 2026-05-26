Project Postiz: schedule social/chat posts 28+ channels. Add posts to calendar, workflow posts at right time.
Features:
- Schedule posts
- Calendar view
- Analytics
- Team management
- Media library

Monorepo, root-only `package.json` deps. PNPM. 3 key folders:

- apps/backend - API code (NESTJS)
- apps/orchestrator - temporal, background jobs (NESTJS), workflows + activities
- apps/frontend - frontend code (Vite ReactJS)
- /libraries - shared services for backend, orchestrator, frontend

Use only pnpm. No frontend deps from npmjs, write native components.

**UI work: ALWAYS read `DESIGN.md` (project root) FIRST before writing any UI.** Brand colors, typography, spacing, component styling — all live there. Match the spec exactly; deviations need approval.

Tailwind 3. Before writing component check:
- /apps/frontend/src/app/colors.scss
- /apps/frontend/src/app/global.scss
- /apps/frontend/tailwind.config.js

`--color-custom*` deprecated, don't use.

Check existing components for design.

Backend: 3 layers required:
Controller >> Service >> Repository (no shortcuts)
Sometimes:
Controller >> Mananger >> Service >> Repository.

Server logic mostly in libs/server. Backend repo mostly controllers + imports from libs.server.

Frontend:
- UI components: /apps/frontend/src/components/ui
- Routing: /apps/frontend/src/app
- Components: /apps/frontend/src/components
- Always SWR for fetching, use `useFetch` from /libraries/helpers/src/utils/custom.fetch.tsx

SWR: each in separate hook, must comply `react-hooks/rules-of-hooks`, never `eslint-disable-next-line`.

Valid:
const useCommunity = () => {
   return useSWR....
}

Invalid:
const useCommunity = () => {
  return {
    communities: () => useSWR<CommunitiesListResponse>("communities", getCommunities),
    providers: () => useSWR<ProvidersListResponse>("providers", getProviders),
  };
}

- Lint runs only from root.
- Only pnpm.
- Production system, many users — don't break existing users, migration may be needed.

---

# Behavioral Guidelines

Reduce common LLM coding mistakes. Merge with project instructions.

**Tradeoff:** bias caution over speed. Trivial tasks → judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State assumptions. Uncertain → ask.
- Multiple interpretations → present them, don't pick silently.
- Simpler approach exists → say so. Push back when warranted.
- Unclear → stop. Name confusion. Ask.

## 2. Simplicity First

**Min code solves problem. Nothing speculative.**

- No features beyond asked.
- No abstractions for single-use code.
- No unrequested flexibility/configurability.
- No error handling for impossible scenarios.
- 200 lines → 50? Rewrite.

Ask: "Senior engineer call this overcomplicated?" Yes → simplify.

## 3. Surgical Changes

**Touch only what you must. Clean only your own mess.**

Editing existing code:
- No "improving" adjacent code/comments/formatting.
- No refactoring unbroken things.
- Match existing style.
- Notice unrelated dead code → mention, don't delete.

Your changes create orphans:
- Remove imports/vars/funcs YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

Test: every changed line traces to user request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks → verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make pass"
- "Fix bug" → "Write test reproducing it, then make pass"
- "Refactor X" → "Tests pass before + after"

Multi-step → brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong criteria → loop independently. Weak ("make it work") → constant clarification.

---

**Guidelines working if:** fewer unnecessary diff changes, fewer overcomplication rewrites, clarifying questions before implementation not after mistakes.