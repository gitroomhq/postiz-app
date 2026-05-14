# SocialStream — App Surface (Postiz fork)

## What This Is

This repo is the **SocialStream app surface** — the in-product experience served at `app.socialstream.be`. It is a fork of [Postiz](https://github.com/gitroomhq/postiz-app) operated under AGPL-3.0 as the publishing engine for the SocialStream managed service.

The companion **marketing site** (`socialstream.be`) lives in a separate repo (`SocialFlow_claude/site/`) and shipped on the **Cadence design system** on 2026-05-13. This repo is the target of the Cadence retrofit.

## Core Value

A Belgian SME or agency logs in here to schedule social posts across 5+ channels, in their own language, with their data resident in Frankfurt. The app must read as one product with the marketing site — same editorial Midnight/Mist/Coral palette, same Inter Tight + Fraunces typography, same calm voice.

## Active Milestone

**Cadence Retrofit (Phase A surface unification)** — bring `app.socialstream.be` onto the Cadence design system that the marketing site already ships on. Briefing: `/Users/storex/.claude/plans/i-want-you-to-fizzy-wind.md`.

Decisions locked 2026-05-14:
- **Scope:** Full app retrofit (every screen Postiz ships).
- **i18n:** EN only for Phase A. NL/FR added after 5 paying pilots.
- **Audit style:** Hybrid — static code inventory first, then live preview walkthrough of top 5–8 surfaces.
- **Dark mode:** Light only this phase. Cadence dark tokens exist; ship separately.

## Constraints

- **AGPL § 13** — every modification reaches the public fork within 30 days. License footer + `/source` link non-negotiable on every authenticated page.
- **No new features beyond what Postiz upstream ships** — this is a brand/UX retrofit, not a product expansion.
- **Tokens > components** — change `colors_and_type.css` import + `tailwind.config.cjs` mapping; do not hardcode Cadence hexes inline.
- **Copy lives in `content/en.ts`** once Wave 2.0 lands; before that, surgical edits in components are OK.
- **Icons routed through `components/Icon.tsx`** (Lucide outline, 16/20/24/32 only) once Wave 2.0 lands.

## Reference docs

- `/Users/storex/Documents/_FC/_Start-ups/SocialFlow/SocialFlow_claude/CLAUDE.md` — Cadence rules + anti-patterns
- `/Users/storex/Documents/_FC/_Start-ups/SocialFlow/SocialFlow_claude/design-system/cadence/HANDOFF.md`
- `/Users/storex/Documents/_FC/_Start-ups/SocialFlow/SocialFlow_claude/design-system/cadence/colors_and_type.css`
- `/Users/storex/Documents/_FC/_Start-ups/SocialFlow/STRATEGY.md` — voice, positioning, pricing
- `/Users/storex/.claude/plans/i-want-you-to-fizzy-wind.md` — full retrofit briefing
