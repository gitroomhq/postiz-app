# Design System: D3 Yellow — Linear-Flat

> **Style:** Linear-flat · **Mood:** Premium, minimal, intentional · **Default theme:** Dark (near-black) · **Brand:** Yellow `#F2E600` on near-black `#0A0A0A`

## 1. Visual Theme & Atmosphere

D3 Creator is a creator-growth showcase across 5 platforms. The interface is **calm, confident, and editorial** — inspired by Linear.app: near-black canvas, flat surfaces, hairline borders, and a single high-energy yellow used like a flashlight beam. Every pixel has a job. No glow, no aurora, no decorative noise.

The brand color `#F2E600` comes directly from the D3 logo. It is **scarce by design** — reserved for the logo, primary CTAs, focus rings, key data points, and the active state of navigation. Everything else lives in a precise grayscale tonal scale on near-black.

Typography is **Inter** — neutral, modern, legible. Body type is `15-16px` at `line-height: 1.6` for editorial calm. Headings are large and confident with tight tracking (`-0.025em` to `-0.035em`). Zero gradient text. Zero text-shadow. Letterforms carry the design.

Surfaces are **flat**: solid fills, 1px borders, square-cornered or `8-12px` radius. Depth comes from **hairline borders and subtle dark shadows** — never from glow or color bleed. Motion is **brief and purposeful**: 150-200ms ease-out on opacity, transform, and color only. Nothing loops, nothing pulses.

**Key Characteristics:**
- Near-black canvas (`#0A0A0D`) with flat **neutral** surfaces — zero yellow undertone in chrome
- Single brand yellow `#F2E600` used **scarcely** — yellow ledger below
- Inter typography, body `15-16px / 1.6`, headings tight-tracked, **headlines white not yellow**
- Hairline 1px borders (`rgba(255,255,255,0.08)` default)
- Radii: `6px` (inputs/badges), `8px` (buttons), `12px` (cards)
- Shadows: dark only — `rgba(0,0,0,0.4)` for elevation
- Motion: 150-200ms ease-out, opacity + transform + color only
- 4/8px spacing grid; max content width `1100-1280px`
- Dark default; light mode optional (not priority)

### Yellow Ledger — Where Yellow IS Allowed (and ONLY here)

| Surface | Use |
|---------|-----|
| Logo | The D3 chain-link icon (image asset) |
| Primary CTA | One per screen — solid `#F2E600` bg + near-black text |
| CTA hover | Lighter `#FDE047` |
| Focus ring | `outline: 2px solid #F2E600` on keyboard focus |
| Active nav | Indicator stripe / dot |
| Active data point | Highlighted row / focused table cell |

**Everywhere else: neutral.** Chip/badge bg → white at 6-8% opacity. Section divider → white at 8% opacity. Status dot → white at 78%. Hero headline → solid white (`#F5F5F5`).

---

## 2. Color Palette & Roles

### Brand Yellow — Tonal Scale (sourced from logo `#F2E600`)

| Token | Hex | Role |
|-------|-----|------|
| `--brand-50` | `#FFFEF0` | Faintest tint, hover-on-white surfaces (light mode) |
| `--brand-100` | `#FFFBC4` | Subtle yellow background wash, badge fill |
| `--brand-200` | `#FFF587` | Inactive yellow indicator |
| `--brand-300` | `#FFEE4A` | Hover state for primary CTA |
| `--brand-400` | `#F8EA10` | Bright yellow accent (rare use) |
| `--brand-500` | `#F2E600` | **Primary brand — logo, CTA, focus ring** |
| `--brand-600` | `#D4C900` | CTA pressed state, focused border |
| `--brand-700` | `#A89F00` | Dark yellow on light surfaces (text on white) |
| `--brand-800` | `#7C7500` | Deep accent, used in data viz only |
| `--brand-900` | `#3E3A00` | Yellow on near-black emphasis backgrounds |

### Surface — Dark (default) · **Neutral, zero yellow undertone**

| Token | Hex / Value | Role |
|-------|-------------|------|
| `--canvas` | `#0A0A0D` | Page background |
| `--canvas-deep` | `#050507` | Deepest layer, behind canvas |
| `--glass-subtle` | `#0F0F12` | Inset well, code block, subtle container |
| `--glass-base` | `#16161A` | Card / panel base |
| `--glass-elevated` | `#1A1A1F` | Elevated card, dropdown, modal |
| `--scrim` | `rgba(0,0,0,0.72)` | Modal backdrop |

> Surfaces moved from yellow-undertone (`#0E0D00`/`#1A1900`) to true neutral cool-black after the scarce-yellow rebalance. Chrome reads gray-neutral; yellow only appears where the Yellow Ledger §1 allows.

### Border

| Token | Value | Role |
|-------|-------|------|
| `--border-subtle` | `rgba(255,255,255,0.06)` | Faintest divider |
| `--border-default` | `rgba(255,255,255,0.08)` | Card / panel border |
| `--border-strong` | `rgba(255,255,255,0.14)` | Hovered card, emphasized input |
| `--border-brand` | `#F2E600` | Focused input, active tab |

### Text

| Token | Value | Role |
|-------|-------|------|
| `--fg` | `#FFFFFF` | Headings, primary body, **all hero headlines (NOT yellow)** |
| `--fg-muted` | `rgba(255,255,255,0.62)` | Secondary body, captions |
| `--fg-subtle` | `rgba(255,255,255,0.40)` | Disabled, meta, timestamps, placeholders |
| `--text-on-brand` | `#0A0A0D` | Text on yellow CTAs (near-black) |
| `--text-inverse` | `#0A0A0D` | Text on white surfaces (light mode) |

> **Headlines stay white.** Yellow text is forbidden except inside the Yellow Ledger §1 surfaces. ShinyText component renders solid white in this system.

### Semantic — Yellow-mono (strict brand)

User mandate: **zero foreign colors anywhere**. Status states communicate through **icon + label + intensity of yellow**, not chromatic variance.

| Token | Hex | Role |
|-------|-----|------|
| `--success` | `#F2E600` (brand-500) | Success — paired with checkmark icon |
| `--warning` | `#FDE047` (brand-300) | Warning — paired with caution icon |
| `--danger` | `#4D3800` (brand-900) | Error / destructive — paired with X icon + clear label |
| `--info` | `#FACC15` (brand-400) | Info — paired with info icon |

> All status comes from icon + label. Color tones stay inside the yellow scale. No red, green, blue, or any foreign hue — anywhere. WCAG safety covered by icon + text, not chromatic differentiation.

---

## 3. Typography

### Font Stack

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
```

Inter is loaded with `font-display: swap`. Variable-weight axis used (`100-900`).

### Scale

| Token | Size | Line | Tracking | Use |
|-------|------|------|----------|-----|
| `--text-xs` | `12px` | `1.5` | `0` | Meta, labels, badges |
| `--text-sm` | `14px` | `1.55` | `-0.005em` | Secondary body, captions |
| `--text-base` | `15px` | `1.6` | `-0.01em` | **Body default** |
| `--text-md` | `16px` | `1.6` | `-0.01em` | Long-form reading |
| `--text-lg` | `18px` | `1.5` | `-0.015em` | Lead paragraphs |
| `--text-xl` | `22px` | `1.4` | `-0.02em` | Section subheads |
| `--text-2xl` | `28px` | `1.3` | `-0.025em` | Card titles, h3 |
| `--text-3xl` | `36px` | `1.2` | `-0.03em` | Page headings, h2 |
| `--text-4xl` | `48px` | `1.1` | `-0.032em` | Section heroes, h1 |
| `--text-5xl` | `64px` | `1.05` | `-0.035em` | Landing hero |
| `--text-6xl` | `80px` | `1.0` | `-0.035em` | Marquee only |

### Weight

- Body: `400`
- Medium emphasis: `500`
- Headings: `600` (not 700 — avoid heavy)
- Display hero: `700` (rare)

### Rules

- **No gradient text.** Solid color only.
- **No text-shadow.** Ever.
- **No uppercase tracking-wide titles.** (Linear-flat is sentence-case, tight-tracked.)
- Headings use `--text-primary` (`#F5F5F5`), never yellow.
- Yellow text reserved for inline brand mentions and active nav state.
- Line-length: max `68ch` for long-form, `52ch` for marketing prose.

---

## 4. Component Stylings

### Buttons

**Primary (yellow)**
```css
background: #F2E600;
color: #0A0A0A;
border: 1px solid #F2E600;
border-radius: 8px;
padding: 10px 16px;
font-weight: 500;
font-size: 14px;
transition: background 150ms ease-out, transform 150ms ease-out;

/* hover */
background: #FFEE4A;

/* active */
background: #D4C900;
transform: translateY(1px);

/* focus */
outline: 2px solid #F2E600;
outline-offset: 2px;
```

**Secondary (ghost)**
```css
background: transparent;
color: #F5F5F5;
border: 1px solid rgba(255,255,255,0.14);
border-radius: 8px;
padding: 10px 16px;

/* hover */
background: rgba(255,255,255,0.04);
border-color: rgba(255,255,255,0.20);
```

**Tertiary (text)**
```css
background: transparent;
color: #A3A3A3;
border: none;
padding: 8px 12px;

/* hover */
color: #F5F5F5;
```

**Sizes:** `sm` (32px h, 12px font), `md` (40px h, 14px font), `lg` (48px h, 16px font).

### Cards

```css
background: #111111;
border: 1px solid rgba(255,255,255,0.08);
border-radius: 12px;
padding: 24px;
transition: border-color 150ms ease-out, background 150ms ease-out;

/* hover (interactive cards only) */
border-color: rgba(255,255,255,0.14);
background: #161616;
```

No shadow on default cards. Elevated cards (modals, popovers) get `box-shadow: 0 8px 24px rgba(0,0,0,0.4)`.

### Navbar

```css
height: 56px;
background: rgba(10,10,10,0.85);
border-bottom: 1px solid rgba(255,255,255,0.06);
backdrop-filter: blur(8px);  /* only place blur is allowed */
padding: 0 24px;
```

- Logo left, nav center, profile right.
- Active link: `color: #F2E600`, no underline, no pill.
- Inactive link: `color: #A3A3A3` → hover `#F5F5F5`.

### Inputs

```css
background: #0A0A0A;
border: 1px solid rgba(255,255,255,0.08);
border-radius: 8px;
padding: 10px 12px;
color: #F5F5F5;
font-size: 14px;
transition: border-color 150ms ease-out;

/* focus */
border-color: #F2E600;
outline: none;
box-shadow: 0 0 0 3px rgba(242,230,0,0.15);  /* only colored shadow allowed */

/* placeholder */
color: #525252;
```

### Badges

```css
display: inline-flex;
align-items: center;
padding: 2px 8px;
border-radius: 6px;
font-size: 12px;
font-weight: 500;
height: 22px;
```

Variants: `default` (`#161616` bg, `#A3A3A3` text), `brand` (`rgba(242,230,0,0.12)` bg, `#F2E600` text), `success` / `warning` / `danger` / `info` (use semantic tokens).

### Tables

- Row height `48px`, cell padding `12px 16px`.
- Header row: `#A3A3A3` text, `12px` uppercase tracking `0.04em` (only place caps are allowed).
- Row border-bottom: `1px solid rgba(255,255,255,0.06)`.
- Hover row: `background: rgba(255,255,255,0.02)`.

---

## 5. Layout Principles

### Spacing Grid

**4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128px** — every value used must come from this scale.

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--space-12: 48px;
--space-16: 64px;
--space-24: 96px;
--space-32: 128px;
```

### Containers

- **Marketing pages:** `max-width: 1100px`, centered, `padding: 0 24px`.
- **App pages:** `max-width: 1280px`, centered, `padding: 0 32px`.
- **Reading content:** `max-width: 720px`, centered.

### Page Rhythm

1. **Hero** — `padding: 96px 0` top/bottom, single column, max-width `720px` for headline.
2. **Features** — `padding: 64px 0`, grid of 2-4 cards.
3. **CTA** — `padding: 96px 0`, centered headline + single primary button.
4. **Footer** — `padding: 48px 0`, hairline top border.

### Grid

- 12-column grid, `gap: 24px`.
- Mobile: single column, `gap: 16px`.

---

## 6. Depth & Elevation

Depth is **structural, not visual**. No glow. No colored shadows. No outer-glow halos.

### Elevation Tiers

| Tier | Treatment |
|------|-----------|
| **0** (canvas) | `#0A0A0A`, no border |
| **1** (card) | `#111111`, `1px solid rgba(255,255,255,0.08)` |
| **2** (raised card) | `#161616`, `1px solid rgba(255,255,255,0.08)` |
| **3** (popover) | `#1C1C1C`, `1px solid rgba(255,255,255,0.10)`, `box-shadow: 0 4px 16px rgba(0,0,0,0.4)` |
| **4** (modal) | `#1C1C1C`, `1px solid rgba(255,255,255,0.12)`, `box-shadow: 0 16px 48px rgba(0,0,0,0.6)` |

Only colored shadow permitted: focus ring `box-shadow: 0 0 0 3px rgba(242,230,0,0.15)` on inputs.

---

## 7. Motion Rules

### Durations

| Token | Value | Use |
|-------|-------|-----|
| `--duration-fast` | `100ms` | Color, opacity micro-states |
| `--duration-base` | `150ms` | **Default — buttons, links, cards** |
| `--duration-slow` | `200ms` | Modals, drawers, page transitions |

### Easings

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);  /* standard */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);  /* symmetric only */
```

### Allowed Properties

- `opacity`
- `transform` (translate, scale)
- `color`, `background-color`, `border-color`

### Forbidden

- `width`, `height`, `padding`, `margin`, `top`, `left`, `font-size`
- Infinite animations on decorative elements
- Spring physics (use ease-out curves only)
- Parallax, scroll-jacking, fireworks, confetti

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. Anti-Slop Rules

**Forbidden — zero tolerance:**

- ❌ Purple / cyan / pink / red / green colors outside the semantic table
- ❌ Gradient text (`background-clip: text`)
- ❌ Glow / colored box-shadows (except `#F2E600` focus ring at 15% alpha)
- ❌ Aurora / radial / mesh gradients
- ❌ Rainbow / multi-color borders
- ❌ Scroll-triggered fireworks, confetti, particle systems
- ❌ Backdrop-filter blur (except navbar)
- ❌ Infinite decorative animations (pulse, bounce, shimmer)
- ❌ Text-shadow on any element
- ❌ Drop-shadow on icons
- ❌ Hardcoded hex values outside the token tables in this file
- ❌ Border-radius above `16px`
- ❌ Heavy font weights (`800` / `900`) outside special display cases

**Permitted single-axis gradients only:**

- Background fade `#0A0A0A` → `#111111` for sectioning (vertical only)
- Yellow-to-yellow tonal gradient `#F2E600` → `#D4C900` on hero CTA (vertical, subtle)

---

## 9. Social Platform Icons

### Source

- Real platform SVGs only — sourced from [simpleicons.org](https://simpleicons.org).
- **No emoji.** No Lucide / Feather generic substitutes for branded platforms.
- **No colored dots / circles** as placeholders.

### Style

- Fill: `#FFFFFF` on dark surfaces, `#0A0A0A` on light surfaces.
- Size: `16px` (badges), `20px` (nav), `24px` (cards), `32px` (heroes).
- Always within a flat circular or square container — never raw on canvas.
- Container background: `#161616` with `1px solid rgba(255,255,255,0.08)`.

### Supported Platforms (5)

| Platform | Source | Container |
|----------|--------|-----------|
| YouTube | simpleicons.org/youtube | flat circle |
| Instagram | simpleicons.org/instagram | flat circle |
| TikTok | simpleicons.org/tiktok | flat circle |
| Twitter / X | simpleicons.org/x | flat circle |
| LinkedIn | simpleicons.org/linkedin | flat circle |

Containers stay neutral — **never** tint container with platform brand color.

---

## Anti-Slop Checklist (QA reference)

- [ ] Zero hardcoded hex values outside token tables
- [ ] Zero colored box-shadows (focus ring at 15% alpha is the only exception)
- [ ] Zero gradient text (no `background-clip: text`)
- [ ] Zero aurora / mesh / radial gradients
- [ ] Zero infinite decorative animations
- [ ] Single-axis linear gradients only (vertical fade for sectioning)
- [ ] All transitions `150-200ms ease-out` on opacity/transform/color only
- [ ] Social icons real SVG from simpleicons.org, white `#FFFFFF`, no colored dots
- [ ] Brand color sourced from logo (`#F2E600`)
- [ ] Inter font, body `15-16px / 1.6`, headings tight-tracked
- [ ] All spacing values from 4/8px scale
- [ ] Max content widths respected (`1100px` marketing, `1280px` app)
- [ ] Hairline 1px borders for elevation (no glow)
- [ ] Yellow used scarcely — CTA, focus, logo, active state only
- [ ] `prefers-reduced-motion` honored everywhere
- [ ] No backdrop-filter outside navbar
- [ ] No purple / cyan / pink outside semantic status

---

**Owner:** Brand Agent · **Source of truth:** this file · **Conflicts:** this file wins.
