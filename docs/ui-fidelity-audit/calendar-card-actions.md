# Calendar / queue card actions + overflow

Prototype: week cards ~1334–1342, queue ~1115–1134, `gridVals` overflow ~7201.

| Element | App | Status |
| --- | --- | --- |
| Week N>2 → 1 card + See all N | `CalendarColumn` | Match |
| Week N=2 → 1-line clamp | `lineClamp` | Match |
| Month +N more | month overflow chip | Match |
| Edit / Duplicate / Preview / Delete (week) | `CalendarItem` | Match |
| Statistics on week | omitted | Match |
| Edit + Statistics on list | `ListItem` | Match |
| Queue Edit / Duplicate / Delete + click | `posts.panel` `QueueCard` | Match |
| Touch / mobile actions visible | `global.scss` | Match |
| groupCell multi-channel | — | Raise |
| Month 24px chips | `CalendarItem` `data-mpost` h24 | Match |
