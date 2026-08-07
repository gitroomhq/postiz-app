# UI fidelity master inventory

Live reconcile of prototype `*Vals()` vs the app after the 2026-08-05 **full design fidelity campaign**.  
Source hierarchy: prototype `*Vals()` > this file > stale per-screen audit checklists (pre-pass; many `[ ]` are historical).

Prototype: `design/handoff/design/PostQueen App v2.dc.html` (or local Downloads handoff).  
Viewports: 420 / 900 / 1440. Themes: `.light` / `.dark` on `<body>`.

Status legend:

| Status | Meaning |
| --- | --- |
| Match | Inventory and primary LOOK match design; spot-check OK |
| Delta | Named visual/structure gaps remain |
| Intentional | Explicitly skipped (capability elsewhere or product decision) |
| Raise | Needs product decision before LOOK can be finished |

---

## Chrome / shell — `chromeVals`

| Surface | App | Status | Notes |
| --- | --- | --- | --- |
| Rail navGroups | `new-layout/rail.tsx`, `top.menu.tsx` | Match | Calendar→Media + More shortcuts; no Plugs/Affiliate/Connections row |
| Create Post Blank/AI (calendar toolbar, not header) | `launches/new.post.tsx` + `filters.tsx` | Match chrome inventory | Header fidelity 2026-08-05 |
| User menu + Affiliate | `new-layout/user.menu.tsx` | Match | Billing & invoices / Sign out; Affiliate gated |
| Rail pin / collapse hover | `rail.tsx`, `global.scss` | Match | Pin/Unpin always visible; collapsed 34px squares |
| Help menu | `new-layout/help.menu.tsx` | Match | Locked docs/shortcuts Intentional |
| Modal / toaster | `layout/new-modal.tsx` | Match | `--inner` shell, `ModalFormActions`, Decision confirm footer; see `modals.md`. Close-confirm trimmed for Scheduled Times. |
| Tokens / viewport | `colors.scss`, `use.viewport.tsx` | Match | Do not change 760/1180 |

## Settings — `settingsVals` + chrome settings markup

| Surface | App | Status | Notes |
| --- | --- | --- | --- |
| Settings open path | `settings.component.tsx` `SettingsPage` | Match | `/settings` scrim only; FREE nested modal removed |
| Sub-nav inventory | same | Match | Workspace / More / Developers; **no Plugs/Affiliate/Billing** (billing = `/billing` + user menu) |
| Global / Language / Teams / list tabs | settings/* | Match | Batch B + remaining Sets/Signatures/Developers/Approved Apps LOOK (2026-08-05 remaining pass) |
| Developers | `public.component.tsx` | Match | Compact API key + Open Connections; Access/Apps code-has |
| Plugs in Settings | — | Intentional | Removed; Channels Automations + `/plugs` |

## Calendar / Posts — `calendarVals` / `gridVals`

| Surface | App | Status | Notes |
| --- | --- | --- | --- |
| Queue + grid (no channel column) | `launches/*` | Match | Gap pass |
| Channel filter | `channel.filter.tsx` | Match | |
| Posts list `showing_x_of_y` | `calendar.tsx` | Match | |
| Mobile posts drawer | `posts.panel.tsx` | Match | |
| Touch drag | — | Intentional | |

## Channels — `pagesVals` channels + `chPlugs`

| Surface | App | Status | Notes |
| --- | --- | --- | --- |
| List + filters + inline Add | `channels.component.tsx` | Match | Gap pass |
| Detail actions | same | Match | |
| Automations | `channel.automations.tsx` | Match | Set up plug / Off; Open Auto-Plugs subtle |
| Platform options accordion | `channels.component.tsx` | Match | chOpts Expand + Edit → SettingsModal |
| Auto-Plugs page | `plugs/*` | Match | Title Auto-Plugs; not in Settings/rail |

## Billing — `pagesVals` + paywall chrome

| Surface | App | Status | Notes |
| --- | --- | --- | --- |
| Plans / lifetime / FAQ / checkout | `billing/*` | Match | CREATOR×active 1440 L/D shot; other 13 cells blocked without Stripe/state fixtures (see `billing-photo-fixture.md` Shot status). Scarcity chip Intentional skip |
| CREATOR yearly $132 | — | Raise | Product — do not invent Stripe prices |
| “Months free” vs coupon | — | Raise | Product — copy honesty vs coupon |

## AI Copilot — `pagesVals` agent

| Surface | App | Status | Notes |
| --- | --- | --- | --- |
| Theme / chrome / input | `agents/*` | Match | |
| 58px attachment thumbs | `agent.input.tsx`, media | Match | Campaign Batch E |
| Posting-to pills / empty CTA | `agent.input.tsx` | Intentional | Owner polish: pill CTA (design soft `No channel selected`); syncs from `AgentList` |
| Channel 3-dot | `agents/agent.tsx`, `menu.tsx` | Match | Menu prop overrides |
| Draft-plan card | — | Raise | No reply-format hook |
| AI-lock overlay | `trial-lock-card.tsx`, `agent.tsx` | Match | Shown when `user.isTrailing` (screenshot override) |

## Connections / Analytics / Media

| Surface | App | Status | Notes |
| --- | --- | --- | --- |
| Connections | `connections.component.tsx` | Match | Rail primary CTA |
| Analytics | `platform-analytics/*` | Match | Channels column = shared chrome panel (260/100, no ghost opacity); Chart.js theme |
| Media | `media/*` | Match | Thumbs OK with real upload URLs; seed default was silhouette (`no-picture.jpg`) — now generates NW PNG. Rename omitted (owner: alt text only, no API) |

## Composer / overlays — `overlayVals`

| Surface | App | Status | Notes |
| --- | --- | --- | --- |
| Compose sheet | `new-launch/manage.modal.tsx` | Match | Chrome + photo; Edit Post title when `existingData.integration`; Raises R1/R2/R3/R4 (FAB / AI picker / confirms / provider settings) unchanged |
| Forms / confirms | settings modals | Match / Delta | Add API key + Decision Match; PlugPop Cancel; see `modals.md` |
| Tour | `onboarding/tour.tsx` | Match | Ghost demo Intentional skip |

## Design vs app — open Raises (keep repo WORK)

Prototype LOOK cues vs app — **do not fake Match with invented WORK**.

| Item | Prototype | App | Keep |
| --- | --- | --- | --- |
| Sets editor shell | in-sheet `openSetEditor` (`settingsVals`) | Fullscreen `AddEditModal` (`sets.tsx`) | Modal WORK |
| Copilot draft-plan card | `chatHasPlan` + drafts (`pagesVals`) | No reply-format hook (`agent.chat.tsx`) | No card |
| Media Rename | menu → `openForm('rename')` | Preview / Download / Alt / Delete | Omitted — owner alt text only, no API |
| Streak Longest | `streakBest` (`chromeVals`) | `streakSince` only | No schema field |
| CREATOR yearly $132 / months-free | `year_price` / `MONTHS_FREE` | Same in `pricing.ts` — Stripe honesty Raise | Don’t invent prices |
| Help shortcuts | live shortcuts sheet | Locked Intentional (`help.menu.tsx`) | Stay locked |
| In-sheet AI FAB | compose FAB (`overlayVals`) | `CopilotPopup` | Keep CopilotKit |
| Claude/ChatGPT write picker | `aiagents` surface | Deep-link `/connections` | Keep |
| groupCell multi-channel | `gridVals` merge | Per-channel cells | Keep |
| Lapsed / payFail invented dates | dated banners | Honest / dateless copy | Keep |
| Billing matrix 01–02, 04–14 | full 14×2 | Blocked without Stripe fixtures | QA debt |

---

## Out of scope / Intentional skips

- `openCommand`, usage meters, `setupVals` panel, scarcity counter, dated `ended` strip, `chatSuggestions`, Milestone 10 (auth/admin/err/preview) as full redesigns
- Stripe/Polotno/Uppy/TipTap/CopilotKit/Chart.js facsimile rebuilds

---

## Campaign log (this pass)

1. **Settings inventory** — Plugs/Affiliate out of Settings; Affiliate → user menu; Channels Automations primary; `/plugs` = Auto-Plugs.
2. **AI Copilot** — thumbs + channel menu; AI-lock overlay when trailing (screenshot pass).
3. **Legacy tokens** — shell/settings/auth/forms sweep (`bg-sixth`, `newBg*`, etc.).
4. Per-screen audit MD files: reconcile checkboxes against this MASTER; prefer MASTER status over unchecked historical lists.
