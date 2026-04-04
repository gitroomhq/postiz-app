/**
 * BB Post Landing Page — Static Data
 * All content arrays are module-level constants (server-hoist-static-io).
 * This file is imported by server components — no 'use client' needed.
 */

// ─── Stats ────────────────────────────────────────────────────────────────────

export const STATS = [
  { value: '27,800+', label: 'GitHub Stars' },
  { value: '19+', label: 'Social Platforms' },
  { value: '100%', label: 'Open Source (AGPL v3)' },
  { value: 'Millions', label: 'Posts Scheduled' },
] as const;

// ─── Platform Logo Bar ────────────────────────────────────────────────────────

export const PLATFORMS = [
  'TikTok',
  'YouTube',
  'Instagram',
  'LinkedIn',
  'X (Twitter)',
  'Facebook',
  'Pinterest',
  'Threads',
  'Bluesky',
  'Reddit',
  'Mastodon',
] as const;

// ─── Features ─────────────────────────────────────────────────────────────────

export const FEATURES = [
  {
    eyebrow: 'Scheduling',
    title: 'Schedule once. Publish everywhere.',
    icon: 'Calendar',
    body: 'Stop logging into each platform one by one. BB Post lets you write, customize, and schedule posts for 19+ social media platforms from a single calendar. Tailor each post\'s format for each platform — all without switching tabs.',
    bullets: [
      'Visual content calendar with drag-and-drop scheduling',
      'Cross-post with per-platform customization',
      'Best-time suggestions based on your audience data',
      'Bulk scheduling for campaigns and content batches',
    ],
  },
  {
    eyebrow: 'AI-Powered',
    title: 'Write less. Post more. Say more.',
    icon: 'Sparkles',
    body: 'BB Post\'s AI content assistant helps you generate platform-native post variations, repurpose long-form content into social snippets, and craft captions that fit each platform\'s style. It\'s not just autocomplete — it\'s a creative partner that knows your brand voice.',
    bullets: [
      'AI-generated post variations from a single idea',
      'Repurpose blogs, newsletters, and videos into social content',
      'Hashtag and keyword suggestions per platform',
      'Design with AI — generate images directly in the composer',
    ],
  },
  {
    eyebrow: 'Automation',
    title: 'Set it up once. Let it run.',
    icon: 'Zap',
    body: 'Go beyond scheduling. BB Post\'s automation engine connects to your existing workflow tools so your social media strategy runs on autopilot. Trigger posts from external events, auto-respond to engagement milestones, and plug into the tools you already use.',
    bullets: [
      'Native integrations with n8n, Make.com, and Zapier',
      'Public API for custom automation workflows',
      'Auto-posting rules triggered by custom conditions',
      'Webhooks for real-time event triggers',
    ],
  },
  {
    eyebrow: 'Analytics',
    title: 'Know what\'s working. Double down.',
    icon: 'BarChart3',
    body: 'BB Post\'s analytics dashboard surfaces what actually moves the needle — not just vanity metrics. Track engagement rates, follower growth, and post performance across every platform in one unified view.',
    bullets: [
      'Cross-platform performance dashboard',
      'Per-post and per-platform analytics',
      'Engagement rate, reach, and click tracking',
      'Exportable reports for clients and stakeholders',
    ],
  },
  {
    eyebrow: 'Teamwork',
    title: 'Built for teams who post together.',
    icon: 'Users',
    body: 'Agencies, marketing teams, and multi-brand businesses have different needs than solo creators. BB Post includes role-based access, approval workflows, and client workspaces — so everyone stays in their lane and nothing goes out without a second pair of eyes.',
    bullets: [
      'Role-based permissions (Admin, Editor, Viewer)',
      'Content approval workflows before publishing',
      'Separate workspaces per brand or client',
      'Team activity feed and audit log',
    ],
  },
  {
    eyebrow: 'Open Source',
    title: 'Your data. Your rules.',
    icon: 'Code2',
    body: 'BB Post is fully open source under AGPL v3. Self-host on your own server, contribute to development, or audit the code yourself. No black-box algorithms deciding what happens to your content. You own your data — always.',
    bullets: [
      'Full source code on GitHub (27,800+ stars)',
      'Self-host on any cloud or on-premise server',
      'Active community of contributors',
      'No vendor lock-in, ever',
    ],
  },
] as const;

// ─── How It Works ─────────────────────────────────────────────────────────────

export const HOW_IT_WORKS_STEPS = [
  {
    title: 'Connect your accounts',
    body: 'Link your TikTok, Instagram, LinkedIn, YouTube, and 15+ other platforms in under 2 minutes. No developer setup required.',
  },
  {
    title: 'Create and schedule your content',
    body: 'Write posts, design with AI, and schedule them on a visual calendar. BB Post optimizes timing based on your audience\'s activity.',
  },
  {
    title: 'Automate and analyze',
    body: 'Set up automation rules, monitor performance, and let BB Post do the repetitive work while you focus on strategy.',
  },
] as const;

// ─── Testimonials ─────────────────────────────────────────────────────────────

export const TESTIMONIALS = [
  {
    quote: 'We manage 12 client accounts and BB Post cut our scheduling time in half. The approval workflow alone saves us 4 hours a week.',
    name: 'Sarah M.',
    role: 'Owner, Digital Marketing Agency',
    initials: 'SM',
  },
  {
    quote: 'I was using 3 different tools for what BB Post does in one. The AI caption suggestions are shockingly good — it actually sounds like my brand.',
    name: 'James K.',
    role: 'Founder, E-commerce Brand',
    initials: 'JK',
  },
  {
    quote: 'The automation rules changed how I run my content calendar. I set it up once and now my content goes out consistently even when I\'m traveling.',
    name: 'Priya L.',
    role: 'Content Creator, 85K followers',
    initials: 'PL',
  },
  {
    quote: 'Being open source was the deciding factor. I can self-host, customize it, and I know exactly what\'s happening with my data.',
    name: 'Alex R.',
    role: 'Indie Hacker',
    initials: 'AR',
  },
] as const;

// ─── Competitive Comparison ───────────────────────────────────────────────────

export const COMPARISON_ROWS = [
  { feature: 'Platforms supported', bbpost: '19+', buffer: '11', later: '6', postiz: '19+' },
  { feature: 'AI content generation', bbpost: true, buffer: true, later: false, postiz: true },
  { feature: 'Workflow automation', bbpost: true, buffer: false, later: false, postiz: true },
  { feature: 'Open source / self-host', bbpost: true, buffer: false, later: false, postiz: true },
  { feature: 'Free plan (not trial)', bbpost: true, buffer: true, later: false, postiz: false },
  { feature: 'Team collaboration', bbpost: true, buffer: true, later: true, postiz: true },
  { feature: 'API access', bbpost: true, buffer: false, later: false, postiz: true },
] as const;

export type ComparisonRow = (typeof COMPARISON_ROWS)[number];

// ─── Pricing ──────────────────────────────────────────────────────────────────

export const PRICING_TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'Connect up to 3 social accounts. No credit card needed.',
    cta: 'Get Started Free',
    ctaHref: '/auth',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 'See Pricing',
    period: '',
    description: 'Unlimited accounts, AI features, automation, and team tools. 7-day free trial.',
    cta: 'View Pro Plans',
    ctaHref: '/auth',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Self-Host',
    price: 'Free',
    period: ' forever',
    description: 'Host on your own server. Full control. Open source.',
    cta: 'View Docs',
    ctaHref: 'https://docs.business-builder.online',
    highlighted: false,
  },
] as const;

// ─── Footer Navigation ────────────────────────────────────────────────────────

export const FOOTER_COLS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Changelog', href: 'https://github.com/BusinessBuilders/BB-Post/releases' },
      { label: 'Roadmap', href: 'https://github.com/BusinessBuilders/BB-Post/issues' },
      { label: 'Open Source', href: 'https://github.com/BusinessBuilders/BB-Post' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: 'https://docs.business-builder.online' },
      { label: 'API Reference', href: 'https://docs.business-builder.online/api' },
      { label: 'Community', href: 'https://github.com/BusinessBuilders/BB-Post/discussions' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'GitHub', href: 'https://github.com/BusinessBuilders/BB-Post' },
      { label: 'Contact', href: 'https://github.com/BusinessBuilders/BB-Post/discussions' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms of Service', href: '/terms-of-service' },
    ],
  },
] as const;

// TikTok compliance links — required in footer per TikTok API policy
export const TIKTOK_COMPLIANCE_LINKS = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms of Service', href: '/terms-of-service' },
  { label: 'Music Usage Confirmation', href: '/music-usage-confirmation' },
  { label: 'Branded Content Policy', href: '/branded-content-policy' },
] as const;
