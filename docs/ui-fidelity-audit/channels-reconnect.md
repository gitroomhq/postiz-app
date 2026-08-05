# Fidelity audit — Channels reconnect + layout (2026-08-05)

Source: owner Reddit disconnected screenshot + prototype
`design/handoff/design/PostQueen App v2.dc.html` (`page:'channels'`, `CHANNELS[].refresh`,
markup `:1719–2007`, list rows `:1161–1180`, vals `chromeVals` / `pagesVals` ~5076–6141).
Repo: `apps/frontend/src/components/channels/channels.component.tsx`,
`channel.automations.tsx`, `launches/menu/menu.tsx` (WORK handlers).

**Rule:** Design LOOK; reconnect WORK = existing
`GET /integrations/social/${identifier}?refresh=${internalId}` → `window.location.href`
(same as calendar `refreshChannel` / Menu). Do not invent OAuth.

## A) Design inventory → App → Status

| # | Design element | Prototype | App file / path | Status |
| --- | --- | --- | --- | --- |
| 1 | Detail / Add column `max-width:760px; margin:0 auto` | `:1720`, `:1861` | `channels.component` centered `max-w-[760px]` | **Match** |
| 2 | Page pad `20px 24px 40px`, gaps 14 (detail) / 18 (add) | `:1719–1720` | `pt-20 px-24 pb-40`, gap 14 / 18 | **Match** |
| 3 | Connect / invite step `max-width:460px` in 760 column | `:1774` `data-tour=connect-step` | `ProviderSetupStep` `max-w-[460px]` | **Match** |
| 4 | Platform grid 4-col, gap 12, tiles h104 r12 | `:1739–1741` | `add.provider` `grid-cols-4` gap 12 | **Match** |
| 4b | Invite by link step: URL + **Copy link** (no Continue) | `:1827–1835` `stepInviteDisplay` | `InviteLinkStep` fetches OAuth URL, Copy link + Back | **Match** |
| 4c | List collapse 260→100 + header `border-b` + Add h36 | `:1143–1157` `toggleCollapse` | `listPane` + `collapseMenu` cookie (shared with Copilot); tablet `_autoSide` | **Match** |
| 4d | Rail Unpin hairline ≈ CHANNELS header line | spacing recipe (~51 / ~54) | Same pad as Copilot column — not measured lock | **Match** |
| 5 | List: red `!` on avatar when `refresh` | `:1170` `#ef4444`, `alertDisplay` | `channels` `bg-pqWarn` `!` badge | **Match** |
| 6 | List: truncated red/warn subtext | fixture meta *"Channel disconnected, click to reconnect"* (`:4081`); `metaColor:var(--warn)` | same `t()` key as calendar | **Match** |
| 7 | List: selected row highlight while disconnected | `rowOn` brandSoft + selBar | `bg-pqNavActive` when selected | **Match** |
| 8 | Detail avatar opacity `.5` when refresh | `chDetailOpacity` | `opacity-50` when needsAttention | **Match** |
| 9 | Status line under name = disconnect copy (clickable intent) | `chDetailMeta` when refresh | clickable meta → `reconnect` | **Match** |
| 10 | Pill **"Needs reconnect"** warn soft | `chDetailState` / `StateBg` + `var(--warn)` | `Needs reconnect` + amberSoft/warn | **Match** |
| 11 | Action: New post + soft Reconnect (warn) + Publishing + Time slots | `:1911–1922` | same + bot when applicable | **Match** |
| 12 | Banner: lost connection + Reconnect CTA | `:1925–1930` amber soft + amberLine | present | **Match** |
| 13 | Stats 3-up still show when disconnected | `:1933` | `ChannelCounts` always | **Match** |
| 14 | Automations block when provider supports plugs | `chPlugs` | `ChannelAutomations` | **Match** |
| 15 | Platform options accordion `chOpts` | `:1965` | `PublishingOptions` | **Match** |
| 16 | Settings groups **Channel** / **Access** | `chDetailGroups` `:6099–6116` | `ChannelSettingsGroups` | **Match** |
| 17 | Channel: Edit time slots → timetable sheet | opens `sheet:'timetable'` | TimeTable modal (Menu API) | **Match** |
| 18 | Channel: Move / add to group | `openForm('customer')` | `CustomerModal` | **Match** |
| 19 | Channel: Custom URL | `openForm('customurl')` | only when `customFields` | **Delta / Raise** |
| 20 | Channel: Copy channel ID | toast | copy + toast | **Match** |
| 21 | Access: Update credentials | design toast / re-auth | customFields → modal; else reconnect | **Match** |
| 22 | Access: Disable / Delete (delete CTA warn) | confirms | same APIs as Menu | **Match** |
| 23 | List attention filter banner | `chNeedsBanner` | present | **Match** |
| 24 | Bot name & avatar action when bot provider | `chDetailBotDisplay` | via Menu only | **Raise** (reachable via Menu) |

## B) WORK paths (do not change semantics)

| Action | Repo |
| --- | --- |
| Reconnect (OAuth) | `channels.component` `reconnect` → `GET /integrations/social/${identifier}?refresh=${internalId}` → redirect |
| Reconnect (menu) | `menu.tsx` `refreshChannel(integration)()` |
| Custom fields / URL | `CustomVariables` in `add.provider.component` |
| Disable / enable / delete | `POST /integrations/disable\|enable`, `DELETE /integrations` |
| Time slots | `TimeTable` → `POST /integrations/${id}/time` |
| Group | `CustomerModal` |
| Attention predicate | `refreshNeeded \|\| inBetweenSteps` (`needsAttention`) |

## C) Implementation plan

1. **Layout:** Wrap add + detail scroll content in `max-w-[760px] w-full mx-auto`; pad `pt-20 px-24 pb-40`; gaps 18 / 14.
2. **Add step:** `ProviderSetupStep` `max-w-[460px]`; platform grid `grid-cols-4 gap-[12px]` (non-onboarding).
3. **Reconnect LOOK:** list + detail copy keys; pill `Needs reconnect`; warn/amber tokens per prototype; avatar opacity; meta click → `reconnect`.
4. **Channel / Access groups:** paint `chDetailGroups` rows; wire CTAs to same handlers as Menu (no new APIs).
5. **Time slots:** action bar + group open TimeTable **modal** (design sheet); drop full-bleed inline card so width matches other rows.
6. **Verify:** `scripts/ui-migration-check.sh`; force disconnect via DB `refreshNeeded` / expired token if available; screenshot matrix owed.

## D) Raises (design has / code lacks — not invented)

| Raise | Notes |
| --- | --- |
| Custom URL always visible | Design always lists it; repo only for `customFields` / `isCustomFields`. Hide when N/A rather than fake. |
| Update credentials always visible | Design always; for OAuth we map to reconnect; for custom fields → `CustomVariables`. |
| Prototype `chDetailReconnect` only toasts | Repo performs real OAuth — keep WORK. |
| Time slots as modal vs inline | Design sheet 440; we use existing modal + TimeTable (max-w 400 inside). |
| Bot name & avatar in action bar | Design shows for discord/slack/telegram/mastodon; keep via Menu + optional action when `changeProfilePicture` / `changeNickName`. |

## E) Local verify

```text
# If a channel has refreshNeeded=true in integrations (or revoke app access on the
# provider), open /channels → select it. Expect list warn subtext, pill, banner,
# Reconnect → provider OAuth URL.
```
