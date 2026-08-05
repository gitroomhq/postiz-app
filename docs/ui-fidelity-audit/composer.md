# Fidelity audit — Composer overlay (compose sheet chrome) (2026-08-05)

Source: side-by-side read of local handoff
`/Users/gkhan/Downloads/design_handoff_postqueen_ui/design/PostQueen App v2.dc.html`
(`sheetCompose` markup **457–1064**, `overlayVals()` **8169–≈8450+**, responsive
compose rules **157–161**) against `apps/frontend/src/components/new-launch/manage.modal.tsx`
(+ editor chrome). **Chrome only** — do **not** rewrite provider settings / form fields.

**Screenshot verification still required** at **420 / 900 / 1440** in **both themes**, with a
**connected channel** (Create Post is gated until an integration exists). Until then, statuses
below are read-only / code-diff judgments, not photo-verified Matches.

---

## Design region refs

| Region | Prototype lines | Tokens / structure |
| --- | --- | --- |
| Mobile/tablet compose CSS | `:157–161` | `[data-compose-split]` column on mobile; scrim pad 0 / card r0; tablet scrim pad 16; preview `max-height:340px` |
| Scrim + card shell | `:458–459` | fixed inset z-85 `bg:var(--popup)` pad **40px**; card `flex:1` column `bg:var(--inner)` **r20** overflow hidden |
| Split panes | `:460–461`, `:722` | left flex:1 + `border-right:1px var(--border)`; right `data-compose-preview` `width:min(580px,44%)` |
| Left header | `:462` | h**65** `bg:var(--bg)` pad 0 20, **20px/600** `{{composeTitle}}` ("Create Post" / "Edit Post") |
| Channel pick + customer | `:463–493` | "SELECT CHANNELS" 11/700 + count chip; 46px rings; customer trigger h42 r8 |
| Global / channel tabs | `:494–506` | 40×40 r8 `bg:var(--tableHeader)`; active ring `#FC69FF` |
| Editor chrome | `:507–591` | r12 `var(--settings)` shell; editor on `var(--tableHeader)` inset ring; toolbar strip `var(--inner)` + `btnSimple` tools |
| Channel settings accordion | `:663–720` | bar h48 `tableHeader` + inset ring (not brand-filled); body `settingsGroupsCompose` — **out of chrome rewrite scope** |
| Preview header + close | `:722–728` | h65 `bg:var(--bg)`; title "Post Preview"; **30×30** close → `askCloseCompose` |
| Preview body | `:729–951` | pad 20, gap 16; empty state inset card |
| FAB / in-sheet copilot | `:954–973` | absolute FAB + popover — **Raise** if product wants design FAB vs CopilotKit popup |
| Footer actions | `:974–1061` | min-h **84**, `border-top:1px var(--border)`, pad 10 20; Tags · Repeat · spacer · Delete · date · **Save as Draft** (`btnSimple` h42 r10) · **Schedule** split brand + chevron · **Post Now** pink `#D82D7E` |

`overlayVals` keys that drive chrome (not provider fields): `sheetCompose`, `composeTitle`,
`askCloseCompose` / close on preview, `composeSelLabel` / `composeChannels`, tabs, footer
`saveDraft` / `addToCalendar` / `scheduleLabel` / `togglePostNow` / `postNow`, tags/repeat/date.

---

## App files (chrome)

| Role | Path |
| --- | --- |
| Compose sheet shell | `apps/frontend/src/components/new-launch/manage.modal.tsx` |
| Editor / toolbar chrome | `apps/frontend/src/components/new-launch/editor.tsx` |
| Channel picker | `apps/frontend/src/components/new-launch/picks.socials.component.tsx` |
| Global / per-channel tabs | `apps/frontend/src/components/new-launch/select.current.tsx` |
| Preview column | `apps/frontend/src/components/new-launch/providers/show.all.providers.tsx` (+ per-provider previews) |
| Footer tags / repeat / date | `launches/tags.component.tsx`, `launches/repeat.component.tsx`, `launches/helpers/date.picker.tsx` |
| Modal host | `apps/frontend/src/components/new-launch/add.edit.modal.tsx` (opens ManageModal) |
| Dummy output chrome | `apps/frontend/src/components/new-launch/dummy.code.component.tsx` |

---

## Match / Delta / Raise — compose sheet chrome

Legend: **Match** = structure/tokens already aligned enough for chrome; **Delta** = visual LOOK gap
safe to restyle later without touching provider settings; **Raise** = behaviour / product gap —
do not invent.

### Shell

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| 1 | Scrim pad 40 / full-bleed card | Match | `manage.modal` `p-[40px]` + `bg-pqInner` card; scrim comes from modal host |
| 2 | Card radius 20 | Match | `rounded-[20px]` + `mobile:rounded-none` |
| 3 | Mobile: scrim pad 0, card r0, split column | Match | `mobile:p-0` + r0; screenshot verify remaining |
| 4 | Tablet scrim pad 16 | Match | `tablet:p-[16px]` |
| 5 | Split: left border-e hairline, right ~580 / 44% | Match | App `border-e` + fixed `w-[580px]` (desktop); % flex is design nuance |

### Headers + close

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| 6 | Dual 65px headers, 20/600 titles | Match | Create Post / Post Preview rows present |
| 7 | Header surface `var(--bg)` | Match | Both headers `bg-pqBg` |
| 8 | Close on preview header | Match | `CloseIcon` → `askClose` (confirm-before-exit is repo behaviour — keep) |
| 9 | Close hit target 30×30 r8 muted | Match | 30×30 r8 button chrome |
| 10 | Title "Edit Post" when editing | Match | `existingData?.integration` → `edit_post_title` / else Create Post (`manage.modal`) |

### Panes (chrome only)

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| 11 | Select-channels row + customer control | Match | `PicksSocialsComponent` + `SelectCustomer` |
| 12 | Global / channel tab strip | Match | `SelectCurrent` |
| 13 | Editor shell r12 + toolbar strip | Match | Token-swept `pqInner` / `pqSettings`; structure Match enough for chrome pass |
| 14 | Settings accordion chrome (collapsed bar) | Match | `bg-pqTableHeader` + inset ring (not brand fill) |
| 15 | Provider settings fields | — | **Out of scope** — do not rewrite |
| 16 | Preview empty / cards | Match* | Behaviour in repo; *screenshot verify with channel |

### Footer actions

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| 17 | Footer h≈84, top hairline, Tags + Repeat left | Match | Inventory present |
| 18 | Date control + Delete (edit only) | Match | |
| 19 | Save as Draft secondary (`btnSimple`) | Match | `bg-btnSimple` / `pqBtnSimple` |
| 20 | Primary Schedule split + chevron | Match | Brand main + 38px chevron; click toggles Post Now popover |
| 21 | Post Now pink `#D82D7E` / `--pink` | Match | `bg-pqPink` |
| 22 | Schedule label variants (Add to calendar / Schedule / Update) | Match | Repo strings via `t()` — keep behaviour |

### Raise (do not implement silently)

| # | Item | Why |
| --- | --- | --- |
| R1 | In-sheet AI FAB (`:954`) vs `CopilotPopup` | Different product surface; do not replace CopilotKit with design FAB without owner call |
| R2 | "Let AI write this post" editor hint (`:524–540`) | LOOK done in `editor.tsx` → `/connections`; Raise remains for design `aiagents` picker vs repo WORK |
| R3 | Design-only confirm on close / remove platform | Repo already has `askClose` / delete dialogs — do not change flow for LOOK |
| R4 | Provider settings visual pass | Explicitly deferred; chrome accordion bar (row 14) is the only settings LOOK note |

---

## Safe LOOK fixes this pass (legacy classes → pq tokens)

Token-only swaps (no handler / provider changes), max 3 files:

1. `manage.modal.tsx` — `border-newBorder` → `border-pqBorder`; scrollbar `newColColor`/`newBgColorInner` → `pqColColor`/`pqInner`; `bg-newSettings` → `bg-pqSettings`; Post Now popover `bg-newBgColorInner` → `bg-pqInner`
2. `editor.tsx` — editor chrome `bg-newBgColorInner` → `bg-pqInner`
3. `dummy.code.component.tsx` — `bg-sixth` → `bg-pqInner`

---

## Verification debt

- [x] Screenshot compose open @ **420 / 900 / 1440**, **light + dark**, with ≥1 connected channel  
      (`docs/ui-shots/compose-qa/compose-{420,900,1440}-{light,dark}.png`; click
      `[data-pq=create-post]` then `[data-pq=continue-without-set]`)
- [x] Compare against prototype compose sheet — chrome Match (r20, dual headers `--bg`,
      Schedule CTA present; channel avatars may show `/no-picture` if upload CDN path
      lags — seed upload URL itself returns 200)
- [x] Re-run `scripts/ui-migration-check.sh`
- [x] `MASTER.md` Compose sheet → Match (chrome + photo pass)

MASTER cross-ref: `docs/ui-fidelity-audit/MASTER.md` → Composer / overlays → Compose sheet.
