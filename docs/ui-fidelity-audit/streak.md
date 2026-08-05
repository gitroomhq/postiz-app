# Fidelity audit — Header streak (2026-08-05)

Source: prototype header `:207–232`, `chromeVals` ~5332–5348;
CSS `:115–116` hover show. App: `streak.component.tsx`.

| Element | Design | App | Status |
| --- | --- | --- | --- |
| Chip | h30, flame `#f97316`, `{N} day streak` | `pqStreak` tokens + design flame path | **Match** |
| Popover | hover, w270, `--pop`, pad 14, gap 11 | `[data-streak-pop]` via global hover/focus-within | **Match** |
| Head | 30×30 soft tile + `{N} day posting streak` | same; no Longest line | **Match** / **Raise** |
| Week | M–S cells, ✓ + soft fill, today ring | derived from continuous `streakSince` | **Match** (approx WORK) |
| Hint | keep-alive / start copy | `t()` fallbacks | **Match** |
| Mobile | hide chip | `[data-mobile="1"] [data-streak]` | **Match** |

## Raises

- **Longest: N days** — design fixture `streakBest`; Prisma/user only has `streakSince`. Omitted until a field exists.
- Week cells are not a per-day post query; they mark local dates in `[today-(streakDays-1), today]`.
