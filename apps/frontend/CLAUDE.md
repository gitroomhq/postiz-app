# Frontend (Next.js 14) — Claude Code Instructions

## Position in Hierarchy

- **Parent:** [`/CLAUDE.md`](../../CLAUDE.md)
- **Relevant siblings:**
  - [`apps/backend/CLAUDE.md`](../backend/CLAUDE.md) — API this UI consumes
  - [`libraries/react-shared-libraries/CLAUDE.md`](../../libraries/react-shared-libraries/CLAUDE.md) — shared UI components (form, helpers, sentry, toaster, translation)
  - [`libraries/nestjs-libraries/src/ai/CLAUDE.md`](../../libraries/nestjs-libraries/src/ai/CLAUDE.md) — reference for components consuming the AI Provider System

## What lives here

Next.js 14 UI with App Router, React 18, Tailwind 3. Routing in `src/app/`, feature components in `src/components/`, hooks in `src/hooks/`. Shared primitive UI components are in `libraries/react-shared-libraries/src/form/`.

## Specific Patterns and Rules

### Data fetching — `useFetch` + SWR (mandatory)

Every API call uses the `useFetch` hook exposed via `FetchWrapperComponent`. Source: `libraries/helpers/src/utils/custom.fetch.tsx`. Do not use native `fetch` or `axios`.

**Each SWR hook lives in its own dedicated function**, complying with `react-hooks/rules-of-hooks`. **Never** use `eslint-disable-next-line` to bypass.

✓ **Valid**:
```typescript
const useCommunity = () => {
  return useSWR<CommunitiesListResponse>('communities', getCommunities);
};
```

✗ **Invalid** (hooks inside an object):
```typescript
const useCommunity = () => ({
  communities: () => useSWR<CommunitiesListResponse>('communities', getCommunities),
  providers:   () => useSWR<ProvidersListResponse>('providers', getProviders),
});
```

### Translations — `useT()` is mandatory

Every user-visible string goes through the `useT()` hook:

```typescript
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const t = useT();
return <button>{t('save_changes', 'Save changes')}</button>;
```

- **No hardcoded strings in JSX.** Even an "OK"/"Cancel" button needs a key.
- When creating a new key, add it to **`libraries/react-shared-libraries/src/translation/locales/pt/translation.json`** AND **`locales/en/translation.json`**. Other languages fall back to English automatically.
- Keys in `snake_case`, descriptive (e.g., `select_late_profile`, `failed_to_add_channel`).
- For translation prose (the value): use **full pt-BR accents**. The "no accents" project rule applies to keys/code only, not translation values.

### Tailwind and styling

Before writing any component, check:

- `src/app/colors.scss` — color tokens (`--new-bgColor`, `--new-textColor`, etc.)
- `src/app/global.scss` — global utilities
- `tailwind.config.js` — active extensions and plugins

The `--color-custom*` variables are **deprecated**. Use `--new-*` tokens and Tailwind classes. Before inventing a new component, check existing ones in the system to keep visual consistency.

### External components

**Never install UI component libraries from npm** (Material UI, Chakra, isolated Radix, etc.) — write native components in React + Tailwind. Reusable primitives live in `libraries/react-shared-libraries/src/form/` (button, input, select, checkbox, slider, color-picker, custom-select, textarea, canonical).

## Key File Map

| File | Purpose |
|---|---|
| `src/app/(app)/` | App Router — authenticated routes (main layout) |
| `src/app/(extension)/` | Routes for the browser extension |
| `src/app/colors.scss` | `--new-*` color tokens |
| `src/app/global.scss` | Global styles |
| `src/app/global-error.tsx` | Next.js error boundary + Sentry capture |
| `src/components/launches/` | Largest surface — composer, calendar, AI providers, modals (~60 components) |
| `src/components/settings/` | Settings panels (AI Provider, Credentials, Profiles, etc.) |
| `src/components/new-layout/` | Current sidebar + topbar |
| `src/components/new-layout/sentry.feedback.component.tsx` | Sentry feedback widget |
| `src/sentry.server.config.ts` / `sentry.edge.config.ts` | Sentry config for SSR/edge |
| `src/instrumentation.ts` | Next.js initialization hook (Sentry) |
| `src/proxy.ts` | Proxy to the backend in dev |

## Common Workflows

### Add a new feature component

1. **Translation first:** define new keys in `pt/translation.json` and `en/translation.json`. Reuse existing keys when possible.
2. **Isolated SWR hook** (if data is needed): new `useFoo` function in `src/hooks/` or in the component's own file.
3. **Component** at `src/components/<area>/<name>.component.tsx`. Tailwind + tokens. Import primitives from `libraries/react-shared-libraries/src/form/` when applicable.
4. **Accessibility:** `aria-*` on buttons/inputs, `role` on custom widgets.
5. **CHANGELOG.md** under `[Unreleased]`.

### Consume a new backend endpoint

```typescript
const fetch = useFetch();
const { data, mutate } = useSWR<MyDto>('my-endpoint', () =>
  fetch('/my-endpoint').then((r) => r.json())
);
```

The `MyDto` type must come from `libraries/nestjs-libraries/src/dtos/` (same source as the backend) — single source of truth.

### Per-profile override (component that respects the active profile)

Use the `useCurrentProfile()` hook to detect the active profile. The default profile (`isDefault=true`) edits the workspace; secondary profiles create overrides at PROFILE scope. See [`libraries/nestjs-libraries/src/ai/CLAUDE.md`](../../libraries/nestjs-libraries/src/ai/CLAUDE.md) for the resolution chain.

## Sentry on the Frontend (`@sentry/nextjs`)

Initial setup in `instrumentation.ts` + `sentry.{server,edge}.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enableLogs: true,
  integrations: [
    // capture console.log/error/warn as structured logs
    Sentry.consoleLoggingIntegration({ levels: ['log', 'error', 'warn'] }),
  ],
});
```

### Structured logger

```typescript
import * as Sentry from '@sentry/nextjs';
const { logger } = Sentry;

logger.trace('Starting database connection', { database: 'users' });
logger.debug(logger.fmt`Cache miss for user: ${userId}`);
logger.info('Updated profile', { profileId: 345 });
logger.warn('Rate limit reached', { endpoint: '/api/results/', isEnterprise: false });
logger.error('Failed to process payment', { orderId: 'order_123', amount: 99.99 });
logger.fatal('Database connection pool exhausted', { activeConnections: 100 });
```

`logger.fmt` is a template literal — use it to interpolate variables in structured logs.

**Backend** Sentry setup (`@sentry/nestjs`, `initializeSentry` helper, global `FILTER`) is in [`apps/backend/CLAUDE.md`](../backend/CLAUDE.md).

## Known Pitfalls

1. **Symptom:** ESLint complaining about `react-hooks/rules-of-hooks` in a custom hook → **Cause:** multiple `useSWR` inside an object returned by the hook. **Fix:** split into isolated hooks (`useCommunity`, `useProviders`).
2. **Symptom:** text appears in English even on `/pt` → **Cause:** new key only added to `en/translation.json`. **Fix:** also add it to `pt/translation.json`.
3. **Symptom:** component breaks layout in dark mode → **Cause:** hardcoded color or use of `--color-custom*`. **Fix:** use `--new-*` tokens or Tailwind theme classes.
4. **Symptom:** billing modal opens in an AI flow when it should be a configuration error → **Cause:** backend returned 402. **Fix:** that is a backend rule (412) — see [`apps/backend/CLAUDE.md`](../backend/CLAUDE.md).
5. **Symptom:** `useT() is undefined` in a client component → **Cause:** missing `'use client'` at the top of the file, or wrong import (`get.transation.service.client` is for client components; there is a separate `.backend` for SSR). **Fix:** import the client variant and mark the component as client.
6. **Symptom:** PR rejected for suggesting `npm install @radix-ui/...` → **Cause:** broke the "no npm UI" rule. **Fix:** copy/adapt a primitive from `react-shared-libraries/src/form/` or write one natively.

## Commands

```bash
pnpm dev                  # Frontend + backend + orchestrator
pnpm build:frontend       # Production build of the frontend
pnpm lint                 # Always from repo root
```

## References

- [`libraries/react-shared-libraries/CLAUDE.md`](../../libraries/react-shared-libraries/CLAUDE.md) — UI primitives and translation patterns
- [`apps/backend/CLAUDE.md`](../backend/CLAUDE.md) — API contracts consumed
- [`docs/architecture/ai-provider-system.md`](../../docs/architecture/ai-provider-system.md) — Settings > AI Provider UI
