# Fidelity audit — Theme contrast (light + dark) (2026-08-05)

Owner report: light theme left some labels / sections unreadable (light-on-light).
Example: **Move / add to group** modal — **Select Customer** nearly invisible.

Status legend: **Fixed** · **OK (intentional)** · **Raise** (unverifiable here)

---

## Root patterns

| Pattern | Why it breaks light | Fix |
| --- | --- | --- |
| Hardcoded `text-white` on labels / body copy over `bg-pqPop` / `bg-pqInner` | White on `#ffffff` / `#fbfbfc` | `text-pqMuted` (labels) / `text-pqText` (body) |
| `text-inputText` for typed field values (`--soft`) | Soft grey as primary text | `text-pqText` + `placeholder:text-pqSoft` |
| Tailwind greys (`text-gray-300/400/500`) | Fixed palette, ignore theme | `text-pqMuted` / `text-pqSoft` |
| SVG `fill="#fff"` / `fill="white"` next to labels | Icon vanishes on light | `currentColor` + token text class |
| Brand CTAs using `text-white` | Same as `--onBrand` today; prefer token | `text-pqOnBrand` |
| `text-white` on brand / warn / dark scrim / media overlays | Contrast is intentional | Leave |

Shared `Input` / `Select` / `Textarea` already used `text-pqMuted` labels — remaining offenders were Mantine Autocomplete overrides, older form primitives (`Canonical`, `CustomSelect`, `MultiSelect`, `Total`, `ColorPicker`), and one-off screens.

---

## Fixed surfaces

| Surface | File(s) | Change |
| --- | --- | --- |
| **Move / add to group → Select Customer** | `launches/customer.modal.tsx` | Dropped `label: 'text-white'`; Autocomplete label/input/dropdown use pq tokens |
| Canonical URL field + bolt icon | `form/canonical.tsx` | Label muted; field chrome; icon `currentColor` |
| CustomSelect / MultiSelect / Total / ColorPicker | `form/*.tsx` | Labels + field chrome aligned with Input |
| Shared Button primary/danger | `form/button.tsx` | `text-pqOnBrand` |
| Decision confirm primary | `layout/new-modal.tsx` | `text-pqOnBrand` |
| AI image prompt/style | `launches/ai.image.tsx` | Field + labels tokens |
| Public post preview + comments | `p/[id]/page.tsx`, `preview/comments.components.tsx` | Removed page-level `text-white` / grey |
| Post statistics modal | `launches/statistics.tsx` | Soft empty states; brand header `text-pqOnBrand` |
| Calendar set picker description | `launches/calendar.tsx` | `text-pqSoft` |
| Date/time picker popover | `launches/helpers/date.picker.tsx` | pq tokens for chrome + selected day |
| Media alt-text field | `launches/helpers/media.settings.component.tsx` | Token field |
| Channel settings modal copy | `launches/settings.modal.tsx` | Muted description |
| Autopost “Post content” label | `autopost/autopost.tsx` | `text-pqMuted` |
| Provider tag labels (Medium/Hashnode/Dev.to) | `*/tags.tsx` | `text-pqMuted` |
| Instagram audio labels/search | `instagram/instagram.audio.tsx` | Tokens |
| Continue YouTube/Tumblr meta | `continue-provider/*` | Soft/muted |
| AI video type chooser | `launches/ai.video.tsx` | Muted |
| Media crop label/description | `media/media.component.tsx` | Muted/soft |
| Import debug JSON field | `launches/import-debug-post.modal.tsx` | Token field |
| Analytics delta (negative) | `platform-analytics/render.analytics.tsx` | `text-pqWarn` (was hex) |
| Char-limit invalid chip | `launches/information.component.tsx` | `text-pqOnBrand` on warn fill |
| Slides voice loading | `videos/.../image-text-slides.provider.tsx` | `text-pqSoft` |

---

## Spot-checked OK (no change)

| Surface | Notes |
| --- | --- |
| Finish trial overlay | Already `text-pqText` / soft close on `bg-pqPop` |
| Lifetime deal / founding cards | Uses `pqLt*` family (theme-aware amber) |
| Billing warn CTAs | White/onBrand on `bg-pqWarn` — intentional |
| Toaster | Already `text-pqText` on `bg-pqPop` |
| Media lightbox chrome | White on `bg-pqTourScrim` (dark in both themes) |
| Auth product showcase | White on dark branded panel |
| Logo crown on brand tile | White on `bg-pqBrand` |
| Settings pane forms using Input/Select | Labels already muted |

---

## Raises (unverifiable without env)

| Topic | Why |
| --- | --- |
| **Billing paywall / trial-ended / payment-fail strips** | Need `billingEnabled` + Stripe state; code uses `pqWarn` / `pqOnBrand` / `pqText` but not screenshot-verified here |
| **Lifetime purchase / redemption happy path** | Needs billing + live Stripe; token usage looks correct in `lifetime.deal.tsx` |
| **Composer provider settings (all 28)** | Needs connected channels; shared Canonical/MultiSelect/tags fixed; remaining provider-specific greys may remain |
| **Onboarding modal gradients** | Still hex gradients + `text-white` on them — intentional dark CTA chrome; not opened this pass |

---

## Checks

No i18n key changes → skipped `scripts/ui-migration-check.sh --update`.
Run plain `scripts/ui-migration-check.sh` before PR if desired.
