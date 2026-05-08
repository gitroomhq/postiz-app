# React Shared Libraries — Claude Code Instructions

## Position in Hierarchy

- **Parent:** [`/CLAUDE.md`](../../CLAUDE.md)
- **Relevant siblings:**
  - [`apps/frontend/CLAUDE.md`](../../apps/frontend/CLAUDE.md) — main consumer of this library
  - [`libraries/nestjs-libraries/CLAUDE.md`](../nestjs-libraries/CLAUDE.md) — backend counterpart

## What lives here

Shared React components + helpers, used by the main frontend (`apps/frontend`), the browser extension (`apps/extension`), and the public API.

| Subdirectory | Content |
|---|---|
| `form/` | UI primitives: `button`, `input`, `select`, `custom.select`, `checkbox`, `textarea`, `slider`, `color.picker`, `canonical`, `total` |
| `helpers/` | Hooks and utilities: `useIsVisible`, `useMediaDirectory`, `usePreventWindowUnload`, `useStateCallback`, `useTrack`, `mantineWrapper`, `safeImage`, `imageWithFallback`, `videoFrame`, `videoOrImage`, `uppyUpload`, `utcDateRender`, `variableContext`, `posthog`, etc. |
| `sentry/` | Shared frontend Sentry wrappers |
| `toaster/` | Toast notification system |
| `translation/` | i18n: `i18n.config`, `i18next`, `useT()` hooks (client and server), `translated-label`, `locales/` (17 languages) |

## Specific Patterns and Rules

### Translation — single source of truth

All product translation files live in `src/translation/locales/<lang>/translation.json`. Current languages: `pt`, `en`, `es`, `fr`, `de`, `it`, `ru`, `tr`, `ja`, `ko`, `zh`, `vi`, `bn`, `ar`, `he`, `ka_ge`, etc. (17).

Exposed hooks:

- `useT()` from `get.transation.service.client` — for client components (`'use client'`)
- A server function from `get.translation.service.backend` — for SSR / Server Components

**Key rules** (apply when creating a new key):

- `snake_case`, descriptive (e.g., `select_late_profile`, `failed_to_add_channel`).
- Add to **both `pt/translation.json` AND `en/translation.json`** simultaneously. Other languages fall back to English automatically (non-blocking).
- **pt-BR values use full accents** (the project's "no accents" rule applies only to KEYS and code, not translation content).
- Reuse before creating — check if it already exists first.

### Form primitives

Before creating a new component in `apps/frontend/src/components/`, **check whether a primitive already exists here**. The primitives have Tailwind + `--new-*` tokens integrated and cover most cases:

| Primitive | For |
|---|---|
| `button.tsx` | Base button with variants |
| `input.tsx` | Text/number input with label |
| `select.tsx` / `custom.select.tsx` | Standard and custom select (with search/groups) |
| `checkbox.tsx` | Checkbox |
| `textarea.tsx` | Textarea |
| `slider.tsx` | Numeric slider |
| `color.picker.tsx` | Color picker |
| `canonical.tsx` | Helper for slug/canonical URLs |
| `total.tsx` | Formatted totals display |

If no suitable primitive exists, **write one natively** — do not install from npm (monorepo rule).

### Reusable helpers (do not reinvent)

| Helper | Use |
|---|---|
| `useIsVisible` | Lazy loading via IntersectionObserver |
| `useMediaDirectory` | Media library listing |
| `usePreventWindowUnload` | Prompt before leaving (dirty form) |
| `useStateCallback` | `useState` with a post-set callback |
| `useTrack` | PostHog tracking |
| `safeImage` / `imageWithFallback` | `<img>` with error fallback |
| `videoFrame` / `videoOrImage` | Conditional video/image rendering |
| `uppyUpload` | Upload via Uppy (with configured providers) |
| `utcDateRender` | Consistent UTC formatting |
| `variableContext` | Global variables context (backend URL, flags) |
| `mantineWrapper` | Wrapper for occasional Mantine components |
| `posthog` | PostHog initialization |
| `delete.dialog` | Delete confirmation modal |

### Sentry and Toaster

- `sentry/` — wrappers that standardize frontend capture (consumed by `apps/frontend/src/components/new-layout/sentry.feedback.component.tsx`).
- `toaster/` — single notification system. Do not introduce alternative toast libraries.

## Key File Map

| File | Purpose |
|---|---|
| `src/form/button.tsx` | Base button — extend via props/className instead of creating variants elsewhere |
| `src/translation/get.transation.service.client.ts` | `useT()` for client components |
| `src/translation/get.translation.service.backend.ts` | Translation in SSR/Server Components |
| `src/translation/i18n.config.ts` | List of supported locales |
| `src/translation/locales/pt/translation.json` | **pt-BR keys (with accents in values)** |
| `src/translation/locales/en/translation.json` | **English keys — global fallback** |
| `src/helpers/variable.context.tsx` | Context with `BACKEND_URL`, flags, etc. |
| `src/helpers/uppy.upload.ts` | Canonical Uppy configuration |

## Common Workflows

### Add a user-visible string

1. Define a descriptive `snake_case` key.
2. Add it to `pt/translation.json` (with accents in the value) AND `en/translation.json` (in English).
3. Consume via `useT()` in the client component (`'use client'`).
4. For SSR, use the server function from `get.translation.service.backend`.

### Add a new form primitive

1. Confirm there is **no** alternative in `form/` or in the frontend.
2. Spec / story (if Storybook is configured) — otherwise write directly in `form/`.
3. Use `--new-*` tokens from colors.scss (see [`apps/frontend/CLAUDE.md`](../../apps/frontend/CLAUDE.md)).
4. Dark-mode support is automatic (tokens already cover it).
5. Export in `index.ts` if there is an aggregator.

### Add a new language

1. Create `src/translation/locales/<lang>/translation.json` (copy `en` and translate progressively).
2. Register in `i18n.config.ts`.
3. Untranslated keys fall back to English — non-blocking.

## Known Pitfalls

1. **Symptom:** new component in the frontend reimplementing button/input from scratch → **Cause:** dev did not see the primitive here. **Fix:** import from `@gitroom/react/form/<primitive>`.
2. **Symptom:** new text appears in English even on `/pt` → **Cause:** key only in `en/translation.json`. **Fix:** add it to `pt/translation.json`.
3. **Symptom:** `useT() is undefined` → **Cause:** missing `'use client'` at the top of the component, or wrong import (`get.translation.service.backend` in client). **Fix:** import `get.transation.service.client` and mark the component as client.
4. **Symptom:** accented characters appear as `?` or boxes → **Cause:** translation file saved in the wrong encoding. **Fix:** `pt/translation.json` must be UTF-8; values **with full accents** (e.g., "Configurações", not "Configuracoes").
5. **Symptom:** new UI component installed via `pnpm add @<library>` → **Cause:** broke the "no npm UI" rule. **Fix:** uninstall and write natively or use a primitive from `form/`.

## Commands

```bash
pnpm test:libs            # Library specs (including this one)
```

## References

- [`apps/frontend/CLAUDE.md`](../../apps/frontend/CLAUDE.md) — `useT()`, Tailwind tokens, isolated-hooks rule
- [`libraries/nestjs-libraries/CLAUDE.md`](../nestjs-libraries/CLAUDE.md) — domain counterpart
