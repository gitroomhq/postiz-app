# Fidelity audit — Modals / overlays (2026-08-05)

Source: `overlayVals()` + form/confirm templates in
`design/handoff/design/PostQueen App v2.dc.html` (~3474–3520 markup, ~8169 vals).
App shell: `apps/frontend/src/components/layout/new-modal.tsx`.

Status legend: **Match** · **Delta** · **Intentional** · **Raise**

---

## Shared chrome (design)

| Element | Design | App target |
| --- | --- | --- |
| Scrim | `var(--popup)`, click-to-close, pad `100px 24px 150px` | `bg-popup` / `bg-pqPopup` via existing shell |
| Card | `var(--inner)`, r24, `var(--shadow)`, pad 32 | `bg-pqInner` + `shadow-pq` + `rounded-[24px]` + `p-[32px]` |
| Form gap | 16px column | shell `gap-[16px]` |
| Confirm gap | 24px column | Decision body owns spacing; shell 16 is ok |
| Title | Form 22px / Confirm 24px, Plus Jakarta 600, −0.015em | shell 24px display (form ok at 24) |
| X close | absolute `end/top 20`, ~28–30px, hover `--hover` | default `withCloseButton` (must not be forced off for form dialogs) |
| Form footer | Primary `flex:1` h42 r10 brand · optional secondary `--settings` · **Cancel** 120×44 outline border | `ModalFormActions` |
| Confirm footer | Primary min112 h46 r12 brand (or danger) · Cancel `btnSimple` | `DecisionModal` |
| Field chrome | h44 `--tableHeader` inset border r10 | shared `Input`/`Select`/`Textarea` + `modalFieldClass` |

---

## Inventory — Design → App → Status

| Design (`FORMS` / overlay) | App open path | Status | Notes |
| --- | --- | --- | --- |
| **apikey** — “Add API key for {title}”, API Key, **Add Integration** + Cancel + X | `third-party.list.component.tsx` → `ApiModal` | **Intentional** | Owner: in-pane `SettingsPaneEditor` (no nested modal / card width jump) |
| Confirm (generic) | `DecisionModal` / `areYouSure` / `deleteDialog` | **Match** | Footer + muted body; delete uses danger primary |
| rename / alttext / upload / library / design | Media / composer trees | **Delta** | Sibling ownership — shell benefits only |
| plug:* | Channels Automations / plugs | **Match** | X + `ModalFormActions`; CopilotTextarea field chrome |
| webhook (+ Send Test) | `webhooks.tsx` | **Intentional** | In-pane editor; Cancel via `ModalFormActions` |
| autopost (+ Send Test) | `autopost.tsx` | **Intentional** | In-pane editor; Cancel + CopilotTextarea field chrome |
| member (Add Member) | `teams.component.tsx` | **Intentional** | In-pane invite form |
| signature | `signatures.component.tsx` | **Intentional** | Settings = in-pane; composer append still `openModal` |
| set | `sets.tsx` | **Raise** | Stays stacked modal (heavy channel picker) — not converted |
| oauthapp / wizard | Developers | **Delta** | Out of this pass except shell |
| feedback / support | Help menu forms | **Delta** | Not opened this pass |
| extension / botpicture / customer / timetable / customurl / newtag | Various | **Delta** / Intentional | Shell only; timetable close-confirm trimmed (see close-confirm) |
| Billing dialogs | `billing/*` | **Intentional** | Sibling agent |
| Compose sheet | `manage.modal.tsx` | **Intentional** | `removeLayout` / custom; close confirm kept |
| Settings nested shell | `settings.component.tsx` | **Match** | Own card, not `new-modal` form |

### Conversion checklist (remaining `openModal`)

| Bucket | Examples | Action |
| --- | --- | --- |
| (1) Settings-like | Phase B leftovers — none for listed CRUD | Convert only if they appear in Settings content later |
| (2) Confirm-only | `deleteDialog` / `DecisionModal` / rotate key | **Keep** |
| (3) Heavy compose | Create Post, Generate Posts, Social Sets, billing cancel, channel connect, media | **Keep** |

### Raise (do not invent)

| Topic | Why |
| --- | --- |
| Design stacked form overlay vs owner inline | **Owner wins** for Settings CRUD |
| Social Sets stays modal/fullscreen | Dedicated step later |
| Connected “Update key” vs “Add API key” copy | Design `ctaLabel` switches; app list is add-only grid today — connected-state CTA is a Settings Integrations Delta, not a new modal product |
| Form title 22px vs confirm 24px | Shell keeps one title size (24) unless we add a `titleSize` prop later |
| Danger color on all confirms | Only delete path forced danger; non-delete `areYouSure` stays brand |

---

## Close-confirm policy (owner)

| Surface | Confirm on close? |
| --- | --- |
| Create a Post / heavy compose (`askClose: true`, manage.modal deleteDialog) | **Keep** |
| Scheduled Times / Time Table Slots | **Removed** — discard dirty on unmount |
| DecisionModal default copy | Unchanged (still used when `askClose` true) |

---

## Results

| Item | Result |
| --- | --- |
| Shared shell + ModalFormActions + DecisionModal | Done (prior) |
| Add API key modal (no 420 squeeze) | Done |
| Signatures / autopost CopilotTextarea chrome | Done |
| Settings webhooks / teams Cancel | Superseded — in-pane editors (2026-08-05) |
| Settings nested modal → inline pane | Done — Webhooks / Autopost / Signatures / Teams / API key |
| Media/composer/billing form bodies | Still Delta (sibling) |
