# Rail footer pin + Media lightbox

## Rail footer (Settings / Upgrade)

Prototype keeps org + Settings + Upgrade under a scrollable nav middle.

| Element | App | Status |
| --- | --- | --- |
| Nav column viewport height | `DesktopSlot` `h-full min-h-0 self-stretch`; chrome row `items-stretch` | Match |
| Only middle menus scroll | `[data-sb-scroll]` `flex-1 min-h-0 overflow-y-auto` | Match |
| Footer pinned | `[data-sb-foot]` `mt-auto shrink-0` outside scroller | Match |
| Mobile drawer footer | Fixed `MobileLayer` top…bottom + same column | Match |

Smoke: scroll `/media` or `/analytics` main content — Settings / Upgrade stay bottom-left of the rail.

## Media lightbox + demo thumbs

Prototype lightbox ~2570–2587; owner screenshots require a **real/demo preview**, not an empty glyph.

| Element | App | Status |
| --- | --- | --- |
| Scrim + title + meta + Download / Delete / Close | `media.lightbox.tsx` | Match |
| Stage 16/10 | same | Match |
| Demo stills | data-URI SVG + gradient underlay on card + lightbox | Match |
| Demo video grid | `thumbGradient` tile | Match |
| Demo video lightbox | sample URL + gradient underlay | Match |
| Rename | omitted | Owner: Change alt text only (no rename API) |

## Raises

- (none for Rename — intentionally omitted)
