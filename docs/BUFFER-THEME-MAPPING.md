# Buffer Theme Color Mapping for Postiz

## Buffer Color Reference

| Name | Hex | Usage |
|------|-----|-------|
| curious-blue | #168eea | Primary buttons/links |
| denim | #137ac9 | Hover states |
| tory-blue | #0f63a4 | Active states |
| outer-space | #323b43 | Text, dark surfaces |
| shuttle-gray | #59626a | Body text |
| geyser | #ced7df | Borders |
| aqua-haze | #f4f7f9 | Light backgrounds |
| burnt-sienna | #ee4f4f | Error/alert states |
| mantis | #76b852 | Success states |

## Postiz Variables → Buffer Mapping

### Light Theme
| Variable | Old Value | New Value |
|----------|-----------|-----------|
| --new-btn-primary | #612bd3 | #168eea |
| --new-bgColor | #f0f2f4 | #f4f7f9 |
| --new-border | #eaecee | #ced7df |
| --new-textColor | 14 14 14 | 50 59 67 |
| --new-back-drop | #2d1b57 | #323b43 |

### Dark Theme (T03)
| Variable | Old Value | New Value |
|----------|-----------|-----------|
| --new-btn-primary | #612bd3 | #168eea |
| --color-forth | #612ad5 | #168eea |
| --color-seventh | #7236f1 | #137ac9 |

## Hardcoded Values to Replace
- `#612bd3` → `#168eea` (primary)
- `#612ad5` → `#168eea` (accent)
- `#7236f1` → `#137ac9` (secondary)
- `#fc69ff` → `#168eea` (focus)
- `#d82d7e` → `#ee4f4f` (AI button)

## Tasks
- [x] T01: Mapping document
- [x] T02: Light theme CSS
- [ ] T03: Dark theme CSS
- [ ] T04: Replace purple accent
- [ ] T05: Clean up custom vars
- [ ] T06: Update global.scss
- [ ] T07: Visual QA
- [ ] T08: Social preview vars