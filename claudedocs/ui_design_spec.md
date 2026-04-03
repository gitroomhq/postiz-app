# BB Post — UI Design Spec & Component Architecture
## Phase 3 Deliverable

> Authored by: UIDesigner | Task: BUS-112 | Date: 2026-04-03
> Based on: Copy doc (BUS-111), Competitor research (BUS-110), CTO pre-brief

---

## 1. Design System Tokens

### Colors (Hard-coded, no CSS variable dependency)
```
Background Primary:   #0E0E0E    (bg-[#0E0E0E])
Background Secondary: #1A1919    (bg-[#1A1919])
Background Card:      #1E1E1E    (bg-[#1E1E1E])
Background Border:    #2A2A2A    (border-[#2A2A2A])
Accent Purple:        #8B5CF6    (text-[#8B5CF6], bg-[#8B5CF6])
Accent Purple Light:  #A78BFA    (text-[#A78BFA]) — hover states
Accent Purple Glow:   rgba(139,92,246,0.15)  — card hover glow
Text Primary:         #FFFFFF    (text-white)
Text Secondary:       #D1D5DB    (text-gray-300)
Text Muted:           #6B7280    (text-gray-500)
Text Eyebrow:         #8B5CF6    (uppercase badge labels)
Success Green:        #22C55E    (checkmarks in comparison table)
Border Subtle:        rgba(255,255,255,0.08)  — border-white/8
```

### Typography Scale
```
Hero Headline:   text-5xl md:text-6xl lg:text-7xl  font-bold tracking-tight
Section Heading: text-3xl md:text-4xl              font-bold
Card Heading:    text-xl md:text-2xl               font-semibold
Eyebrow Label:   text-xs                           font-semibold uppercase tracking-widest
Body Large:      text-lg md:text-xl                font-normal text-gray-300
Body:            text-base                         font-normal text-gray-300
Small:           text-sm                           font-normal text-gray-500
Nav:             text-sm                           font-medium
CTA Primary:     text-base                         font-semibold
```

### Spacing & Layout
```
Max Content Width: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
Section Padding:   py-20 md:py-28
Card Padding:      p-6 md:p-8
Card Gap:          gap-6 md:gap-8
Border Radius:     rounded-2xl  (cards)
                   rounded-xl   (buttons)
                   rounded-full (badges, avatar)
Nav Height:        h-16 md:h-20
```

### Shadows & Glows
```
Card Hover Glow:  box-shadow: 0 0 40px rgba(139,92,246,0.15)
Hero Glow:        radial-gradient behind headline (decorative)
CTA Button Glow:  shadow-[0_0_30px_rgba(139,92,246,0.4)] on hover
```

---

## 2. File Structure

```
apps/frontend/src/app/(landing)/
├── page.tsx                    — Root landing page (server component, no auth check)
├── layout.tsx                  — Minimal layout (no app shell, no sidebar)
└── components/
    ├── nav.tsx                 — Sticky navigation bar
    ├── hero.tsx                — Hero section
    ├── trust-bar.tsx           — Stats + logo marquee
    ├── features.tsx            — 6-feature grid
    ├── how-it-works.tsx        — 3-step process
    ├── testimonials.tsx        — 4 testimonial cards
    ├── comparison.tsx          — Competitor table
    ├── cta-mid.tsx             — Mid-page CTA block
    ├── pricing-teaser.tsx      — Pricing 3-column teaser
    ├── cta-final.tsx           — Bottom CTA block
    └── footer.tsx              — Full footer with TikTok compliance links
```

**Route isolation**: Use `(landing)` route group — separate layout from `(app)` to avoid auth middleware, sidebar, and app shell entirely.

**IMPORTANT — No root layout.tsx**: This Next.js app has NO `app/layout.tsx`. The `(app)/layout.tsx` is itself a root-level layout with `<html>` and `<body>`. Therefore `(landing)/layout.tsx` MUST also be a full root layout with `<html>`, `<body>`, and its own font loading:

```tsx
// apps/frontend/src/app/(landing)/layout.tsx
import { Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import '../global.scss';

const jakartaSans = Plus_Jakarta_Sans({
  weight: ['400', '500', '600', '700'],
  style: ['normal'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata = {
  title: 'BB Post — All your social media. One smart dashboard.',
  description:
    'Open-source social media scheduler for businesses and creators. Schedule, automate, analyze across 19+ platforms. Free to start.',
  openGraph: {
    title: 'BB Post — All your social media. One smart dashboard.',
    description:
      'Open-source social media scheduler. 19+ platforms, AI content, automation. Free plan available.',
    url: 'https://social.business-builder.online',
    siteName: 'BB Post',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
};

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={jakartaSans.className}>
      <body className="bg-[#0E0E0E] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
```

Note: `global.scss` import ensures Tailwind base styles load. No `dark` class needed — landing page uses explicit hex values, not CSS variable theming.

**Auth redirect logic**: Handled in `middleware.ts` — see Section 9 for the exact code change required.

---

## 3. shadcn/ui Components Required

Install these with `npx shadcn@latest add <component>`:

| Component | Usage |
|-----------|-------|
| `button`  | Nav CTA, Hero CTAs, Section CTAs, Footer CTA |
| `badge`   | Eyebrow labels (SCHEDULING, AI-POWERED, etc.) |
| `card`    | Feature cards, Testimonial cards, Pricing cards |
| `sheet`   | Mobile nav drawer (hamburger → slide-in menu) |
| `avatar`  | Testimonial author photos (placeholder initials) |
| `separator` | Section dividers where needed |

No accordion needed — FAQ not in current copy. Skip tooltip for now.

**Button variants needed:**
```tsx
// Primary (purple filled)
<Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-8 py-4 text-base font-semibold rounded-xl transition-all duration-200 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]">
  Start Free — No Credit Card Required
</Button>

// Ghost/Outline
<Button variant="outline" className="border-white/20 text-white hover:bg-white/5 px-8 py-4 text-base font-semibold rounded-xl">
  See How It Works
</Button>
```

---

## 4. Section-by-Section Spec

### Section 1: Navigation (`nav.tsx`)

**Layout**: sticky top-0 z-50, backdrop-blur-md, border-b border-white/8
```
[BB Post Logo]  |  Features  Pricing  Docs  GitHub  Blog  |  [Start Free →]
```

**Tailwind classes:**
```tsx
<nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#0E0E0E]/80 border-b border-white/[0.08]">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
    {/* Logo */}
    <div className="flex items-center gap-2">
      <Image src="/logo.png" alt="BB Post" width={32} height={32} />
      <span className="text-white font-bold text-lg">BB Post</span>
    </div>
    {/* Desktop nav */}
    <div className="hidden md:flex items-center gap-8">
      {['Features', 'Pricing', 'Docs', 'GitHub', 'Blog'].map(link => (
        <a className="text-sm font-medium text-gray-400 hover:text-white transition-colors" />
      ))}
    </div>
    {/* CTA + Mobile */}
    <div className="flex items-center gap-3">
      <Button className="hidden md:flex bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-sm px-4 py-2">
        Start Free →
      </Button>
      <Sheet> {/* mobile hamburger */} </Sheet>
    </div>
  </div>
</nav>
```

**Animation**: None (sticky nav — avoid layout shift). Logo fades in on initial load (Framer Motion `initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.3 }}`).

**Mobile**: Sheet component slides from right. Links stack vertically. CTA full-width.

---

### Section 2: Hero (`hero.tsx`)

**Layout**: `min-h-[90vh] flex flex-col items-center justify-center text-center relative overflow-hidden`

**Background**: `bg-[#0E0E0E]` with subtle radial gradient glow behind headline:
```tsx
{/* Decorative glow */}
<div className="absolute inset-0 pointer-events-none">
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#8B5CF6]/10 rounded-full blur-3xl" />
</div>
```

**Content structure:**
```
[Optional badge: "Open Source · AGPL v3 · 27,800+ GitHub Stars ↗"]
[H1: "All your social media. One smart dashboard."]
[Sub: "BB Post is an open-source social media..."]
[CTA Row: [Start Free — No Credit Card Required]  [See How It Works]]
[Micro-copy: "Free plan available. Pro trial included. Cancel anytime."]
[Hero Image/Screenshot: Dashboard mockup or animated platform logos]
```

**Tailwind classes:**
```tsx
<section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 py-20 bg-[#0E0E0E] overflow-hidden">
  {/* Pre-headline badge */}
  <div className="inline-flex items-center gap-2 bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 rounded-full px-4 py-1.5 text-sm text-[#A78BFA] font-medium mb-8">
    Open Source · AGPL v3 · 27,800+ GitHub Stars ↗
  </div>
  {/* Headline */}
  <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight max-w-4xl leading-tight mb-6">
    All your social media.{' '}
    <span className="text-[#8B5CF6]">One smart dashboard.</span>
  </h1>
  {/* Subheadline */}
  <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
    BB Post is an open-source social media scheduler built for businesses...
  </p>
  {/* CTA buttons */}
  <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
    <Button className="w-full sm:w-auto bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-8 py-4 text-base font-semibold rounded-xl ...">
      Start Free — No Credit Card Required
    </Button>
    <Button variant="outline" className="w-full sm:w-auto border-white/20 ...">
      See How It Works
    </Button>
  </div>
  {/* Micro-copy */}
  <p className="text-sm text-gray-500">Free plan available. Pro trial included. Cancel anytime.</p>
</section>
```

**Framer Motion animations:**
```tsx
// Stagger children on load
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
}
const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
}

// Reduced motion fallback
const prefersReducedMotion = useReducedMotion()
// If true, skip stagger — render all visible immediately
```

---

### Section 3: Trust Signal Bar (`trust-bar.tsx`)

**Two sub-sections:**
1. **Stats row**: 4 stat pills in a horizontal row
2. **Platform logo marquee**: infinite horizontal scroll

**Stats row:**
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
  {stats.map(({ value, label }) => (
    <div className="text-center p-4 bg-[#1A1919] rounded-2xl border border-white/[0.08]">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  ))}
</div>
```

Stats data:
```ts
const stats = [
  { value: '27,800+', label: 'GitHub Stars' },
  { value: '19+', label: 'Social Platforms' },
  { value: '100%', label: 'Open Source (AGPL v3)' },
  { value: 'Millions', label: 'Posts Scheduled' },
]
```

**Platform logo marquee:**
```tsx
// CSS marquee using Tailwind animation
// Two copies of logo row for seamless loop

<div className="relative overflow-hidden">
  {/* Fade edges */}
  <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#0E0E0E] to-transparent z-10" />
  <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#0E0E0E] to-transparent z-10" />

  <div className="flex animate-[marquee_40s_linear_infinite] gap-12 w-max">
    {[...platforms, ...platforms].map((platform, i) => (
      <div key={i} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors whitespace-nowrap">
        {platform.icon}
        <span className="text-sm font-medium">{platform.name}</span>
      </div>
    ))}
  </div>
</div>
```

Platforms: TikTok, YouTube, Instagram, LinkedIn, X (Twitter), Facebook, Pinterest, Threads, Bluesky, Reddit, Mastodon

Add to `tailwind.config.js` keyframes:
```js
marquee: {
  '0%': { transform: 'translateX(0)' },
  '100%': { transform: 'translateX(-50%)' }
}
```

**Section wrapper:**
```tsx
<section className="py-16 bg-[#0E0E0E] border-y border-white/[0.08]">
```

---

### Section 4: Features Grid (`features.tsx`)

**Layout**: 6 features in a 2-column grid (md), 3-column (lg)

**Section wrapper:**
```tsx
<section className="py-20 md:py-28 bg-[#0E0E0E]">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
        Everything you need to post consistently and grow.
      </h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      {features.map((feature, i) => <FeatureCard key={i} {...feature} index={i} />)}
    </div>
  </div>
</section>
```

**FeatureCard component:**
```tsx
<div className="group relative p-6 md:p-8 bg-[#1A1919] rounded-2xl border border-white/[0.08] hover:border-[#8B5CF6]/50 transition-all duration-300 hover:shadow-[0_0_40px_rgba(139,92,246,0.1)]">
  {/* Icon container */}
  <div className="w-12 h-12 bg-[#8B5CF6]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#8B5CF6]/20 transition-colors">
    <FeatureIcon className="w-6 h-6 text-[#8B5CF6]" />
  </div>
  {/* Eyebrow */}
  <Badge className="bg-[#8B5CF6]/10 text-[#A78BFA] border-[#8B5CF6]/30 text-xs font-semibold tracking-widest uppercase mb-3">
    {feature.eyebrow}
  </Badge>
  {/* Title */}
  <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
  {/* Body */}
  <p className="text-gray-400 text-sm leading-relaxed mb-4">{feature.body}</p>
  {/* Bullets */}
  <ul className="space-y-2">
    {feature.bullets.map((bullet, j) => (
      <li key={j} className="flex items-start gap-2 text-sm text-gray-500">
        <span className="text-[#8B5CF6] mt-0.5 flex-shrink-0">✓</span>
        {bullet}
      </li>
    ))}
  </ul>
</div>
```

**Framer Motion — scroll-triggered stagger:**
```tsx
// Wrap grid in motion.div with viewport trigger
const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
}
const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
}

<motion.div
  variants={gridVariants}
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, margin: '-100px' }}
  className="grid ..."
>
  {features.map((f, i) => (
    <motion.div key={i} variants={cardVariants}>
      <FeatureCard {...f} />
    </motion.div>
  ))}
</motion.div>
```

**Feature icons** (use Lucide React — already in Next.js ecosystem):
- Scheduling: `Calendar`
- AI: `Sparkles`
- Automation: `Zap`
- Analytics: `BarChart3`
- Team: `Users`
- Open Source: `Github` or `Code2`

---

### Section 5: How It Works (`how-it-works.tsx`)

**Layout**: 3 steps in a row (lg) or stacked (mobile), connected by dotted line

```tsx
<section className="py-20 md:py-28 bg-[#1A1919]">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
      Start posting smarter in minutes.
    </h2>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 relative">
      {/* Connecting line (desktop only) */}
      <div className="hidden lg:block absolute top-8 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-[#8B5CF6]/50 to-transparent" />
      {steps.map((step, i) => (
        <div key={i} className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#8B5CF6] rounded-2xl flex items-center justify-center mb-6 text-white text-2xl font-bold">
            {i + 1}
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
          <p className="text-gray-400 text-sm leading-relaxed">{step.body}</p>
        </div>
      ))}
    </div>
    <div className="text-center mt-16">
      <Button className="bg-[#8B5CF6] ...">
        Get Started Free — It Takes 2 Minutes
      </Button>
    </div>
  </div>
</section>
```

**Animation**: Each step card fades up with stagger (same pattern as features).

---

### Section 6: Testimonials (`testimonials.tsx`)

**Layout**: 2×2 grid (md+), 1 column (mobile)

```tsx
<section className="py-20 md:py-28 bg-[#0E0E0E]">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
      Teams that post more, grow more.
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {testimonials.map((t, i) => (
        <Card key={i} className="bg-[#1A1919] border-white/[0.08] p-6 md:p-8 rounded-2xl hover:border-[#8B5CF6]/30 transition-all duration-300">
          {/* Stars */}
          <div className="flex gap-1 mb-4">
            {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-[#8B5CF6] text-[#8B5CF6]" />)}
          </div>
          {/* Quote */}
          <p className="text-gray-300 text-base leading-relaxed mb-6 italic">
            "{t.quote}"
          </p>
          {/* Author */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 bg-[#8B5CF6]/20">
              <AvatarFallback className="text-[#8B5CF6] font-semibold text-sm">
                {t.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-white font-semibold text-sm">{t.name}</div>
              <div className="text-gray-500 text-xs">{t.role}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  </div>
</section>
```

---

### Section 7: Competitive Comparison (`comparison.tsx`)

**Layout**: Scrollable table on mobile, fixed on desktop

```tsx
<section className="py-20 md:py-28 bg-[#1A1919]">
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
    <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
      More platform. More power. Less price.
    </h2>
    <div className="overflow-x-auto mt-12 rounded-2xl border border-white/[0.08]">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="bg-[#0E0E0E] border-b border-white/[0.08]">
            <th className="text-left p-4 text-gray-400 text-sm font-medium">Feature</th>
            {/* BB Post column highlighted */}
            <th className="p-4 text-sm font-semibold text-white bg-[#8B5CF6]/10 border-x border-[#8B5CF6]/30">BB Post</th>
            <th className="p-4 text-sm font-medium text-gray-400">Buffer</th>
            <th className="p-4 text-sm font-medium text-gray-400">Later</th>
            <th className="p-4 text-sm font-medium text-gray-400">Postiz</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/[0.05] hover:bg-white/[0.02]">
              <td className="p-4 text-gray-300 text-sm">{row.feature}</td>
              <td className="p-4 text-center bg-[#8B5CF6]/5 border-x border-[#8B5CF6]/20">
                {row.bbpost ? <Check className="w-5 h-5 text-[#22C55E] mx-auto" /> : <X className="w-5 h-5 text-gray-600 mx-auto" />}
              </td>
              {/* other cols */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="text-center text-gray-400 text-sm mt-6 italic">
      BB Post is the only open-source social scheduler with AI content, full automation, and a free plan — all in one product.
    </p>
  </div>
</section>
```

---

### Section 8: Mid-Page CTA (`cta-mid.tsx`)

**Layout**: Centered, gradient background card

```tsx
<section className="py-20 md:py-28 bg-[#0E0E0E]">
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="relative rounded-3xl bg-gradient-to-br from-[#1A1919] to-[#0E0E0E] border border-[#8B5CF6]/30 p-12 md:p-16 text-center overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[#8B5CF6]/5 rounded-3xl" />
      <div className="relative">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to post smarter?</h2>
        <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
          Join businesses and creators who schedule, automate, and grow with BB Post.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <Button className="bg-[#8B5CF6] ...">Start Free Today</Button>
          <Button variant="outline" className="...">Explore Pricing</Button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
          {['No credit card required', 'Free plan available', '14-day Pro trial', 'Cancel anytime'].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#8B5CF6]" /> {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
</section>
```

---

### Section 9: Pricing Teaser (`pricing-teaser.tsx`)

**Layout**: 3 pricing cards — Free / Pro / Self-Host

```tsx
<section className="py-20 md:py-28 bg-[#1A1919]">
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
    <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
      Simple, transparent pricing.
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Free */}
      <Card className="bg-[#0E0E0E] border-white/[0.08] rounded-2xl p-8">
        <div className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Free</div>
        <div className="text-4xl font-bold text-white mb-2">$0<span className="text-lg text-gray-500">/mo</span></div>
        <p className="text-gray-500 text-sm mb-6">Connect up to 3 social accounts</p>
        <Button variant="outline" className="w-full border-white/20 text-white">Get Started Free</Button>
      </Card>
      {/* Pro — highlighted */}
      <Card className="bg-[#8B5CF6]/10 border-[#8B5CF6]/40 rounded-2xl p-8 relative">
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#8B5CF6] text-white text-xs">Most Popular</Badge>
        <div className="text-sm font-semibold text-[#A78BFA] uppercase tracking-widest mb-4">Pro</div>
        <div className="text-4xl font-bold text-white mb-2">From $X<span className="text-lg text-gray-400">/mo</span></div>
        <p className="text-gray-400 text-sm mb-6">Unlimited accounts, AI, automation, analytics</p>
        <Button className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white">Start Pro Trial</Button>
      </Card>
      {/* Self-Host */}
      <Card className="bg-[#0E0E0E] border-white/[0.08] rounded-2xl p-8">
        <div className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Self-Host</div>
        <div className="text-4xl font-bold text-white mb-2">Free<span className="text-lg text-gray-500"> forever</span></div>
        <p className="text-gray-500 text-sm mb-6">Host on your own server. Full control.</p>
        <Button variant="outline" className="w-full border-white/20 text-white">View Docs</Button>
      </Card>
    </div>
    <p className="text-center mt-8">
      <a href="/pricing" className="text-[#8B5CF6] hover:text-[#A78BFA] text-sm font-medium transition-colors">
        See full pricing →
      </a>
    </p>
  </div>
</section>
```

---

### Section 10: Final CTA (`cta-final.tsx`)

```tsx
<section className="py-20 md:py-28 bg-[#0E0E0E]">
  <div className="max-w-3xl mx-auto px-4 text-center">
    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
      Your audience is out there.<br />
      <span className="text-[#8B5CF6]">Start reaching them.</span>
    </h2>
    <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
      BB Post is free to start, open to extend, and built for businesses that take social media seriously.
    </p>
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
      <Button className="w-full sm:w-auto bg-[#8B5CF6] ...text-lg px-10 py-5">
        Create Your Free Account
      </Button>
      <a href="#" className="text-sm text-gray-500 hover:text-gray-400 transition-colors">
        Already using Postiz? Import your account →
      </a>
    </div>
    <p className="text-sm text-gray-600">
      Open source · AGPL v3 · 27,800+ GitHub stars · Trusted worldwide
    </p>
  </div>
</section>
```

---

### Section 11: Footer (`footer.tsx`)

```tsx
<footer className="bg-[#1A1919] border-t border-white/[0.08] py-16">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Top: Logo + description */}
    <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
      {/* Brand col — spans 2 on md */}
      <div className="col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <Image src="/logo.png" alt="BB Post" width={28} height={28} />
          <span className="text-white font-bold">BB Post</span>
        </div>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
          Open-source social media scheduler. Built for businesses and creators who want real results.
        </p>
      </div>
      {/* Product */}
      <FooterCol title="Product" links={['Features', 'Pricing', 'Changelog', 'Roadmap', 'Open Source']} />
      {/* Resources */}
      <FooterCol title="Resources" links={['Documentation', 'API Reference', 'Blog', 'Community']} />
      {/* Company + Legal */}
      <div>
        <FooterCol title="Company" links={['About', 'Contact', 'Status']} />
        <FooterCol title="Legal" links={['Privacy Policy', 'Terms of Service']} className="mt-6" />
      </div>
    </div>
    {/* Divider */}
    <Separator className="bg-white/[0.08] mb-8" />
    {/* Bottom: TikTok compliance + copyright */}
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <p className="text-gray-600 text-xs">
        © 2026 BB Post. Open source under AGPL v3. Built on Postiz.
      </p>
      {/* TikTok compliance links (required) */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <a href="/privacy-policy" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
        <a href="/terms-of-service" className="hover:text-gray-400 transition-colors">Terms of Service</a>
        <a href="/music-usage-confirmation" className="hover:text-gray-400 transition-colors">Music Usage Confirmation</a>
        <a href="/branded-content-policy" className="hover:text-gray-400 transition-colors">Branded Content Policy</a>
      </div>
    </div>
    {/* TikTok compliance note */}
    <p className="text-xs text-gray-700 mt-4 max-w-2xl">
      By connecting TikTok to BB Post, you agree to TikTok's platform policies. 
      See our <a href="/music-usage-confirmation" className="underline">Music Usage Confirmation</a> and{' '}
      <a href="/branded-content-policy" className="underline">Branded Content Policy</a>.
    </p>
  </div>
</footer>
```

---

## 5. Framer Motion Animation Reference

### Utility hooks (create once, reuse everywhere)

```tsx
// hooks/use-scroll-animation.ts
import { useReducedMotion } from 'framer-motion'

export function useFadeUpVariants(delay = 0) {
  const prefersReduced = useReducedMotion()
  return {
    hidden: prefersReduced ? { opacity: 1 } : { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut', delay },
    },
  }
}
```

### Animation patterns by use case

| Use case | Pattern |
|----------|---------|
| Hero headline | `initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.7, ease:'easeOut' }}` |
| Hero sub/CTA | Same with 0.15s delay per item |
| Section reveal | `whileInView={{ opacity:1, y:0 }} viewport={{ once:true, margin:'-80px' }}` |
| Card stagger | `staggerChildren: 0.08` on parent |
| Card hover | `whileHover={{ scale:1.02 }}` with `transition={{ type:'spring', stiffness:400 }}` |
| Button hover | CSS hover via Tailwind (no Framer needed for simple color) |
| Logo marquee | Pure CSS `animation: marquee 40s linear infinite` — no Framer |
| Reduced motion | `useReducedMotion()` hook → skip y transforms, skip scale, keep opacity only |

### Page entry sequence
```
0ms:    Nav logo fades in (0.3s)
100ms:  Pre-headline badge (0.5s fade-up)
200ms:  H1 (0.7s fade-up)
400ms:  Subheadline (0.5s fade-up)
550ms:  CTA buttons (0.5s fade-up)
700ms:  Micro-copy (0.4s fade-up)
900ms+: Hero visual / stats (0.6s fade-up)
```

---

## 6. Responsive Breakpoints

| Breakpoint | Behavior |
|-----------|----------|
| `< 640px` (xs/sm) | Single column layouts. Hero text: 3xl. CTA buttons: full-width. Nav: hamburger Sheet. Trust bar: horizontal scroll. Comparison table: horizontal scroll. |
| `640px+` (sm) | CTA buttons row. 2-column trust stats. |
| `768px+` (md) | 2-column feature grid. 2×2 testimonials. 3-column footer. |
| `1024px+` (lg) | 3-column feature grid. 3-column how-it-works. Desktop nav. Max content width active. |
| `1280px+` (xl) | max-w-7xl constrains content. Hero text hits 7xl. |

---

## 7. React Best Practices & Performance

### Server vs Client Component Split

Most landing sections are **pure RSC** (no hooks, no interactivity). Only animated wrappers need `'use client'`.

| Component | Type | Reason |
|-----------|------|--------|
| `layout.tsx` | Server | Metadata, font loading |
| `page.tsx` | Server | Assembles sections |
| `nav.tsx` | Client (`'use client'`) | Sheet state, scroll listener |
| `hero.tsx` | Split — static RSC + `<HeroAnimations />` client child | |
| `trust-bar.tsx` | Server (CSS marquee, no JS) | |
| `features.tsx` | Split — data RSC + `<FeaturesGrid />` client for stagger | |
| `how-it-works.tsx` | Server | No animations beyond CSS |
| `testimonials.tsx` | Server | Static cards, no JS |
| `comparison.tsx` | Server | Static table |
| `cta-mid.tsx` | Server | Static |
| `pricing-teaser.tsx` | Server | Static |
| `cta-final.tsx` | Server | Static |
| `footer.tsx` | Server | Static |

**Pattern for animated sections** — keep the data/markup in a server component, extract only the animation wrapper as a client component:

```tsx
// features.tsx — SERVER component
import { FeaturesGrid } from './features-grid'; // client

export function Features() {
  return (
    <section className="py-20 md:py-28 bg-[#0E0E0E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
          Everything you need to post consistently and grow.
        </h2>
        <FeaturesGrid features={FEATURES} />
      </div>
    </section>
  );
}
```

```tsx
// features-grid.tsx — CLIENT component
'use client';
import dynamic from 'next/dynamic';
const MotionDiv = dynamic(
  () => import('framer-motion').then((m) => ({ default: m.motion.div })),
  { ssr: false }
);
```

### Static Data at Module Level (`server-hoist-static-io`)

All static arrays MUST be declared at module level — never inside components:

```ts
// data/landing.ts — shared module-level constants
export const STATS = [
  { value: '27,800+', label: 'GitHub Stars' },
  { value: '19+', label: 'Social Platforms' },
  { value: '100%', label: 'Open Source (AGPL v3)' },
  { value: 'Millions', label: 'Posts Scheduled' },
] as const;

export const PLATFORMS = [
  'TikTok', 'YouTube', 'Instagram', 'LinkedIn', 'X (Twitter)',
  'Facebook', 'Pinterest', 'Threads', 'Bluesky', 'Reddit', 'Mastodon',
] as const;

export const FEATURES = [ /* ... */ ] as const;
export const TESTIMONIALS = [ /* ... */ ] as const;
export const COMPARISON_ROWS = [ /* ... */ ] as const;
```

### Dynamic Imports for Framer Motion (`bundle-dynamic-imports`)

Framer Motion is ~50KB. Use `next/dynamic` with `ssr: false` for motion wrappers to keep them out of the initial SSR bundle:

```tsx
'use client';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'framer-motion';

// Only load motion components after hydration
const MotionDiv = dynamic(
  () => import('framer-motion').then((m) => ({ default: m.motion.div })),
  { ssr: false, loading: () => <div /> }
);
```

For the hero entry animation specifically, the page is visible immediately — use CSS `@keyframes` for the initial load animation and Framer Motion only for scroll-triggered reveals to reduce Time To Interactive.

### Conditional Rendering (`rendering-conditional-render`)

Use ternary, never `&&`, to avoid rendering `0` or `false` as text:

```tsx
// ❌ Wrong
{prefersReduced && <StaticFallback />}

// ✅ Correct
{prefersReduced ? <StaticFallback /> : <AnimatedVersion />}
```

### Other Performance Rules

- **Images**: Use `next/image` with `priority` on logo + hero image. All below-fold: `loading="lazy"`.
- **Logo marquee**: Pure CSS animation — zero JS runtime cost. Do NOT use Framer Motion for this.
- **Platform icons**: SVG inline or lucide-react (tree-shakeable, no icon fonts).
- **shadcn/ui**: Each component is its own file — only install what you use.
- **Barrel imports** (`bundle-barrel-imports`): Import shadcn components directly, e.g. `import { Button } from '@/components/ui/button'` not from a barrel index.
- **Font**: Declare `Plus_Jakarta_Sans` in `(landing)/layout.tsx` with `display: 'swap'` for zero layout shift.

---

## 8. Pre-installed Dependencies

**framer-motion is already installed** at v12.38.0 — do NOT run `pnpm add framer-motion`.

**Radix UI** has only `label`, `separator`, `slot` installed. shadcn/ui needs setup:
```bash
# From apps/frontend directory:
npx shadcn@latest init
# Then add each component:
npx shadcn@latest add button card badge sheet avatar separator
```

---

## 9. Critical Middleware Fix (Required)

**File**: `apps/frontend/src/middleware.ts`

The existing middleware has an early-return block (lines 28–37) that passes `/` through to Next.js for ALL users — both authenticated and unauthenticated. This means authenticated users would see the landing page instead of being redirected to the dashboard.

**Replace** this block:
```ts
if (
  nextUrl.pathname === '/' ||
  nextUrl.pathname.startsWith('/uploads/') ||
  nextUrl.pathname.startsWith('/p/') ||
  nextUrl.pathname.startsWith('/icons/')
) {
  return topResponse;
}
```

**With** this block:
```ts
if (
  nextUrl.pathname.startsWith('/uploads/') ||
  nextUrl.pathname.startsWith('/p/') ||
  nextUrl.pathname.startsWith('/icons/')
) {
  return topResponse;
}

// Landing page routing:
// - Unauthenticated users at / → show landing page
// - Authenticated users at / → redirect to dashboard
if (nextUrl.pathname === '/') {
  if (authCookie) {
    return NextResponse.redirect(
      new URL(!!process.env.IS_GENERAL ? '/launches' : '/analytics', nextUrl.href)
    );
  }
  return topResponse; // unauthenticated → show landing page
}
```

This is the ONLY modification to existing app code that is necessary and justified — it's a routing fix required to make the landing page work correctly.

---

## 10. FooterCol Helper Component

```tsx
// Used inside footer.tsx — simple helper, not a separate file
function FooterCol({
  title,
  links,
  className = '',
}: {
  title: string;
  links: string[];
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="text-white font-semibold text-sm mb-4">{title}</h3>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link}>
            <a
              href={`/${link.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              {link}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 11. Implementation Checklist for FrontendDev

**Setup:**
- [ ] Apply middleware fix in `apps/frontend/src/middleware.ts` (see Section 9 above)
- [ ] Run `npx shadcn@latest init -d` (the `-d` flag is **required** — without it the command is interactive and blocks). shadcn will detect Next.js and create `components.json`. **Warning**: init rewrites `globals.css` — since this project uses `global.scss`, after running init manually merge any new CSS variables into `global.scss` and delete the generated `globals.css`.
- [ ] Then: `npx shadcn@latest add button card badge sheet avatar separator`
- [ ] Avatar sizing: use Tailwind classes only — `<Avatar className="h-10 w-10">`. The shadcn Avatar has **no `size` prop**.
- [ ] Add `marquee` keyframe to `apps/frontend/tailwind.config.js` (framer-motion v12.38.0 already installed — do NOT re-install)

**Already scaffolded — DO NOT recreate:**
- ✅ `apps/frontend/src/app/(landing)/data/landing.ts` — all static data arrays (STATS, FEATURES, PLATFORMS, TESTIMONIALS, COMPARISON_ROWS, PRICING_TIERS, FOOTER_COLS, TIKTOK_COMPLIANCE_LINKS)
- ✅ `apps/frontend/src/app/(landing)/layout.tsx` — full root layout with `<html><body>`, variable font (`weight: 'variable'`), metadata, viewport exports
- ✅ `apps/frontend/src/app/(landing)/opengraph-image.tsx` — OG image (file-based convention, covers OG + Twitter automatically)

**Still to create:**
- [ ] `apps/frontend/src/app/(landing)/page.tsx` — server component, assembles all sections

**Components (11 server + client split):**
- [ ] `nav.tsx` — `'use client'` (Sheet state)
- [ ] `hero.tsx` — RSC shell + `hero-animations.tsx` client child for entry animation
- [ ] `trust-bar.tsx` — RSC (CSS marquee only, no JS)
- [ ] `features.tsx` — RSC shell + `features-grid.tsx` client child (scroll stagger)
- [ ] `how-it-works.tsx` — RSC
- [ ] `testimonials.tsx` — RSC
- [ ] `comparison.tsx` — RSC
- [ ] `cta-mid.tsx` — RSC
- [ ] `pricing-teaser.tsx` — RSC
- [ ] `cta-final.tsx` — RSC
- [ ] `footer.tsx` — RSC (includes FooterCol helper from Section 10)

**Code quality checks:**
- [ ] All Framer Motion imports use `next/dynamic` with `ssr: false`
- [ ] All static data arrays are module-level constants in `data/landing.ts`
- [ ] No `&&` in JSX conditionals — use ternary throughout
- [ ] No barrel imports — all shadcn imports are direct file paths
- [ ] `useReducedMotion()` implemented in all animated client components

**Verification:**
- [ ] Verify route: unauthenticated hits `/` → landing page renders
- [ ] Verify route: authenticated hits `/` → redirects to `/launches` or `/analytics`
- [ ] Mobile test: 375px, 768px, 1280px, 1536px
- [ ] Run `pnpm run dev:frontend` and screenshot all sections
- [ ] TikTok compliance: confirm all 4 footer links present and clickable
- [ ] Lighthouse run: target > 90 performance, accessibility, best-practices

---

## 9. Dependency on Phase 1a (Crawler — BUS-109)

BUS-109 (LookUp crawler) is still `todo`. The spec above does not depend on it — I've used the competitor research from BUS-110 (done) and the CTO pre-brief.

If BUS-109 delivers actual CSS tokens or design patterns before Phase 4 starts, the FrontendDev can incorporate any refinements. The spec is complete without it.
