#!/usr/bin/env node
//
// Fills a development workspace so Channels, Calendar, Analytics, Settings
// (webhooks / signatures / sets / autopost / integrations) and the Copilot
// channel column can be looked at with realistic inventory.
//
//   node scripts/seed-dev-workspace.mjs --email you@example.com
//   node scripts/seed-dev-workspace.mjs --org <orgId>
//   node scripts/seed-dev-workspace.mjs --email … --avatar /path/to/me.png
//   node scripts/seed-dev-workspace.mjs --email … --revoke
//
// Avatar + every seeded channel picture use the same file copied into
// UPLOAD_DIRECTORY and served at FRONTEND_URL/uploads/… (not Dicebear).
// Without --avatar, generates a branded NW PNG (not public/no-picture.jpg)
// so Media + channel thumbs are distinguishable in QA screenshots.
//   node scripts/seed-dev-workspace.mjs --org <id> --dry
//
// Marker prefix: `dev-seed-ws*`. `--revoke` removes only what this script
// wrote (integrations, posts, settings rows, third-party, seeded notifications,
// seeded Media / pictureId, and Redis analytics stubs).
//
// Channel tokens are the literal `dev-seed-not-a-real-token` — publish will
// fail at the provider, which is the correct outcome. Prefer future QUEUE
// dates so the worker does not spam failures.
//
// Lifetime entitlement is separate: if the org has no subscription, run
//   node scripts/grant-lifetime.mjs --org <id>
// (this script prints that hint; it does not grant on its own).
//
// NOT FOR PRODUCTION.
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import sharp from 'sharp';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
} from 'fs';
import { basename, extname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

loadEnv();

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const dry = process.argv.includes('--dry');
const revoke = process.argv.includes('--revoke');
const email = arg('email');
const orgArg = arg('org');
const avatarArg = arg('avatar');

const MARKER = 'dev-seed-ws';
const NOTIF_MARKER = `<!--${MARKER}-->`;
const TOKEN = 'dev-seed-not-a-real-token';
const POST_GROUP = 'dev-seed-ws-posts';
const MEDIA_NAME = 'dev-seed-ws-avatar';

const ANALYTICS_ALLOWLIST = new Set([
  'facebook',
  'instagram',
  'instagram-standalone',
  'linkedin-page',
  'tiktok',
  'youtube',
  'gmb',
  'pinterest',
  'threads',
  'x',
]);

// Most healthy; one refreshNeeded; one disabled — mirrors real account noise.
const CHANNELS = [
  { provider: 'facebook', name: 'Northwind Facebook', refreshNeeded: false, disabled: false },
  { provider: 'x', name: 'Northwind on X', refreshNeeded: false, disabled: false },
  { provider: 'instagram', name: 'Northwind Instagram', refreshNeeded: false, disabled: false },
  { provider: 'linkedin-page', name: 'Northwind LinkedIn', refreshNeeded: false, disabled: false },
  { provider: 'tiktok', name: 'Northwind TikTok', refreshNeeded: false, disabled: false },
  { provider: 'youtube', name: 'Northwind YouTube', refreshNeeded: false, disabled: false },
  { provider: 'threads', name: 'Northwind Threads', refreshNeeded: true, disabled: false },
  { provider: 'pinterest', name: 'Northwind Pinterest', refreshNeeded: false, disabled: true },
  { provider: 'mastodon', name: 'Northwind Mastodon', refreshNeeded: false, disabled: false },
  { provider: 'bluesky', name: 'Northwind Bluesky', refreshNeeded: true, disabled: false },
];

// Varied notification copy for the header bell — HTML content + seed marker.
const NOTIFICATIONS = [
  'Your post to <strong>Northwind Facebook</strong> published successfully.',
  'Failed to publish to <strong>Northwind on X</strong> — token expired. Reconnect the channel.',
  '<strong>Northwind Threads</strong> needs reconnect — refresh token invalid.',
  '<strong>Northwind Pinterest</strong> is disabled — enable it in Channels to resume posting.',
  'Access token refreshed for <strong>Northwind Instagram</strong>.',
  'Your trial ends in 3 days — upgrade to keep scheduled posts running.',
  'Scheduled post <strong>Launch teaser</strong> is queued for tomorrow at 9:30 AM.',
  'Billing receipt for March is ready — view it in Billing & invoices.',
];

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(HERE, '..');

const prisma = new PrismaClient();

/** Distinct QA avatar — brand circle + NW initials (not the public silhouette). */
async function writeGeneratedAvatar(diskPath) {
  const size = 256;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#a21caf"/>
    </linearGradient>
  </defs>
  <circle cx="128" cy="128" r="128" fill="url(#g)"/>
  <text x="128" y="148" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="96" font-weight="700" fill="#fff">NW</text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(diskPath);
}

function series(days, base, step, jitter) {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const n = days - i;
    data.push({
      total: String(
        Math.max(1, base + ((n * step) % jitter) + ((n * 3) % 11))
      ),
      date: d.toISOString().slice(0, 10),
    });
  }
  return data;
}

function analyticsStub(days) {
  // Design Analytics shows a denser X-like grid (~6 cards). Live API count
  // still wins when redis is cold; this only fills the seed demo.
  return [
    {
      label: 'Impressions',
      data: series(days, 420, 17, 180),
      percentageChange: 4.2,
    },
    {
      label: 'Engagement',
      data: series(days, 48, 3, 40),
      percentageChange: -1.1,
    },
    {
      label: 'Likes',
      data: series(days, 32, 2, 28),
      percentageChange: 2.4,
    },
    {
      label: 'Replies',
      data: series(days, 6, 1, 12),
      percentageChange: 0.8,
    },
    {
      label: 'Reposts',
      data: series(days, 9, 1, 14),
      percentageChange: -0.4,
    },
    {
      label: 'Followers',
      data: series(days, 1200, 5, 40),
      percentageChange: 1.6,
      average: false,
    },
  ];
}

async function seedApprovedApps(org, user) {
  if (!user) {
    console.log('  approved apps: skipped (no user)');
    return;
  }
  const apps = [
    {
      slug: 'claude',
      name: 'Claude',
      description: 'Anthropic Claude — connect workspaces via OAuth',
    },
    {
      slug: 'n8n',
      name: 'n8n',
      description: 'n8n automation — schedule and publish from workflows',
    },
    {
      slug: 'zapier',
      name: 'Zapier',
      description: 'Zapier — trigger PostQueen from thousands of apps',
    },
  ];

  if (dry) {
    console.log(`  [dry] would seed ${apps.length} approved OAuth apps`);
    return;
  }

  // OAuthApp is unique on (organizationId, deletedAt) — one live app per
  // vendor org. Seed tiny vendor orgs so Approved Apps can list three.
  for (const app of apps) {
    const vendorName = `${MARKER}-oauth-${app.slug}`;
    let vendor = await prisma.organization.findFirst({
      where: { name: vendorName },
      select: { id: true },
    });
    if (!vendor) {
      vendor = await prisma.organization.create({
        data: { name: vendorName },
        select: { id: true },
      });
    }

    const clientId = `${MARKER}-${app.slug}-client`;
    let oauthApp = await prisma.oAuthApp.findFirst({
      where: { clientId },
      select: { id: true },
    });
    if (!oauthApp) {
      oauthApp = await prisma.oAuthApp.create({
        data: {
          organizationId: vendor.id,
          name: app.name,
          description: app.description,
          redirectUrl: 'https://example.com/oauth/callback',
          clientId,
          clientSecret: `${MARKER}-secret-${app.slug}`,
        },
        select: { id: true },
      });
    }

    const existing = await prisma.oAuthAuthorization.findFirst({
      where: {
        oauthAppId: oauthApp.id,
        userId: user.id,
        organizationId: org.id,
      },
      select: { id: true, revokedAt: true, accessToken: true },
    });
    if (existing) {
      await prisma.oAuthAuthorization.update({
        where: { id: existing.id },
        data: {
          revokedAt: null,
          accessToken: existing.accessToken || `${MARKER}-token-${app.slug}`,
        },
      });
    } else {
      await prisma.oAuthAuthorization.create({
        data: {
          oauthAppId: oauthApp.id,
          userId: user.id,
          organizationId: org.id,
          accessToken: `${MARKER}-token-${app.slug}`,
        },
      });
    }
  }
  console.log(`  seeded ${apps.length} approved apps (Claude / n8n / Zapier)`);
}

async function resolveOrg() {
  if (orgArg) {
    const org = await prisma.organization.findUnique({
      where: { id: orgArg },
      select: { id: true, name: true },
    });
    if (!org) {
      console.error(`No organization ${orgArg} on this database.`);
      return null;
    }
    const membership = await prisma.userOrganization.findFirst({
      where: { organizationId: org.id },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
    return { org, user: membership?.user ?? null };
  }

  if (!email) {
    console.error('Pass --email <addr> or --org <id>.');
    return null;
  }

  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      organizations: {
        include: { organization: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!user) {
    console.error(`No user ${email} on this database.`);
    return null;
  }

  const superAdmin = user.organizations.find((o) => o.role === 'SUPERADMIN');
  const pick = superAdmin || user.organizations[0];
  if (!pick) {
    console.error(`${email} belongs to no organization.`);
    return null;
  }
  return { org: pick.organization, user };
}

function uploadDir() {
  const dir = process.env.UPLOAD_DIRECTORY || join(ROOT, 'uploads');
  return dir;
}

function mediaDiskPathFromUrl(url) {
  if (!url) return null;
  const idx = url.indexOf('/uploads/');
  if (idx === -1) return null;
  return `${uploadDir()}${url.slice(idx + '/uploads'.length)}`;
}

async function seedAvatarFile() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const inner = `/${y}/${m}/${d}`;
  const dir = `${uploadDir()}${inner}`;
  const frontend = (process.env.FRONTEND_URL || 'http://localhost:4200').replace(
    /\/$/,
    ''
  );

  if (avatarArg) {
    const src = resolve(avatarArg);
    if (!existsSync(src)) {
      console.error(`Avatar file not found: ${src}`);
      return { mediaId: null, publicPath: null, diskPath: null, missing: true };
    }
    const ext = extname(src) || '.jpg';
    const randomName = randomBytes(16).toString('hex');
    const diskPath = `${dir}/${randomName}${ext}`;
    const publicPath = `${inner}/${randomName}${ext}`;
    const url = `${frontend}/uploads${publicPath}`;
    if (!dry) {
      mkdirSync(dir, { recursive: true });
      copyFileSync(src, diskPath);
    }
    return { diskPath, publicPath, url, originalName: basename(src), source: src };
  }

  const randomName = randomBytes(16).toString('hex');
  const diskPath = `${dir}/${randomName}.png`;
  const publicPath = `${inner}/${randomName}.png`;
  const url = `${frontend}/uploads${publicPath}`;
  if (!dry) {
    mkdirSync(dir, { recursive: true });
    await writeGeneratedAvatar(diskPath);
  }
  return {
    diskPath,
    publicPath,
    url,
    originalName: 'dev-seed-ws-avatar.png',
    source: 'generated:northwind-nw',
  };
}

async function clearRedis(orgId, integrationIds) {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log('  REDIS_URL unset — skipping analytics key cleanup');
    return;
  }
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
  try {
    await redis.connect();
  } catch (e) {
    console.log(`  redis unreachable (${e.message}) — skipping analytics cleanup`);
    redis.disconnect();
    return;
  }
  let removed = 0;
  for (const id of integrationIds) {
    for (const days of [7, 30, 90]) {
      const key = `integration:${orgId}:${id}:${days}`;
      if (!dry) removed += await redis.del(key);
      else {
        if (await redis.exists(key)) removed += 1;
      }
    }
  }
  redis.disconnect();
  console.log(
    `  ${dry ? '[dry] would clear' : 'cleared'} ${removed} redis analytics key(s)`
  );
}

async function seedNotifications(org, user) {
  if (!user) {
    console.log('  notifications: skipped (no user)');
    return;
  }

  const existing = await prisma.notifications.count({
    where: {
      organizationId: org.id,
      content: { contains: NOTIF_MARKER },
    },
  });
  if (existing) {
    console.log(
      `  notifications: ${existing} seeded row(s) already present — skipping (use --revoke to clear)`
    );
    return;
  }

  const now = Date.now();
  console.log(`  notifications: ${NOTIFICATIONS.length} rows`);

  if (dry) return;

  for (let i = 0; i < NOTIFICATIONS.length; i++) {
    const createdAt = new Date(now - (i + 1) * 3 * 60 * 60 * 1000);
    await prisma.notifications.create({
      data: {
        organizationId: org.id,
        content: `<p>${NOTIFICATIONS[i]}</p>${NOTIF_MARKER}`,
        createdAt,
      },
    });
  }

  const lastRead = new Date(now - 7 * 24 * 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastReadNotifications: lastRead },
  });
  console.log(
    `  user.lastReadNotifications → ${lastRead.toISOString()} (${NOTIFICATIONS.length} unread)`
  );
}

async function revokeNotifications(org) {
  const removed = await prisma.notifications.deleteMany({
    where: {
      organizationId: org.id,
      content: { contains: NOTIF_MARKER },
    },
  });
  console.log(
    `  ${dry ? '[dry] would remove' : 'removed'} ${removed.count} seeded notification(s)`
  );
}

async function writeRedisStubs(orgId, channels) {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log('  REDIS_URL unset — skipping analytics stubs');
    return;
  }
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
  try {
    await redis.connect();
  } catch (e) {
    console.log(`  redis unreachable (${e.message}) — skipping analytics stubs`);
    redis.disconnect();
    return;
  }

  let written = 0;
  for (const ch of channels) {
    if (ch.refreshNeeded) continue;
    if (!ANALYTICS_ALLOWLIST.has(ch.providerIdentifier)) continue;
    for (const days of [7, 30, 90]) {
      // 90-day window is not offered for every provider in the UI; still stub
      // it — reading a missing range is worse than an unused key.
      const key = `integration:${orgId}:${ch.id}:${days}`;
      const payload = JSON.stringify(analyticsStub(days));
      if (!dry) {
        await redis.set(key, payload, 'EX', 60 * 60 * 24 * 7);
      }
      written += 1;
    }
  }
  redis.disconnect();
  console.log(
    `  ${dry ? '[dry] would write' : 'wrote'} ${written} redis analytics stub(s) (EX 7d)`
  );
}

async function revokeAll(org, user) {
  const integrations = await prisma.integration.findMany({
    where: {
      organizationId: org.id,
      internalId: { startsWith: MARKER },
    },
    select: { id: true, name: true },
  });

  console.log(
    `${dry ? '[dry] would revoke' : 'revoking'} workspace seed on ${org.name}:`
  );
  console.log(`  channels: ${integrations.length}`);

  await clearRedis(
    org.id,
    integrations.map((i) => i.id)
  );

  if (!dry) {
    if (user) {
      const media = await prisma.media.findFirst({
        where: { organizationId: org.id, name: MEDIA_NAME },
      });
      if (media && user.pictureId === media.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { pictureId: null },
        });
      }
      if (media) {
        const disk = mediaDiskPathFromUrl(media.path);
        if (disk) {
          try {
            if (existsSync(disk)) unlinkSync(disk);
          } catch {
            /* ignore */
          }
        }
        await prisma.media.delete({ where: { id: media.id } }).catch(() => {});
      }
    }

    if (integrations.length) {
      await prisma.integration.updateMany({
        where: {
          organizationId: org.id,
          internalId: { startsWith: MARKER },
        },
        data: { picture: null },
      });
    }

    // Join rows go with the webhook / integration deletes.
    await prisma.integrationsWebhooks.deleteMany({
      where: {
        OR: [
          { integrationId: { in: integrations.map((i) => i.id) } },
          { webhook: { organizationId: org.id, name: { startsWith: MARKER } } },
        ],
      },
    });
    await prisma.post.deleteMany({
      where: { organizationId: org.id, group: { startsWith: POST_GROUP } },
    });
    await prisma.integration.deleteMany({
      where: { organizationId: org.id, internalId: { startsWith: MARKER } },
    });
    await prisma.webhooks.deleteMany({
      where: { organizationId: org.id, name: { startsWith: MARKER } },
    });
    await prisma.signatures.deleteMany({
      where: {
        organizationId: org.id,
        content: { contains: `<!--${MARKER}-->` },
      },
    });
    await prisma.sets.deleteMany({
      where: { organizationId: org.id, name: { startsWith: MARKER } },
    });
    await prisma.autoPost.deleteMany({
      where: { organizationId: org.id, title: { startsWith: MARKER } },
    });
    await prisma.thirdParty.deleteMany({
      where: {
        organizationId: org.id,
        internalId: { startsWith: MARKER },
      },
    });

    await revokeNotifications(org);

    if (user) {
      await prisma.oAuthAuthorization.deleteMany({
        where: {
          userId: user.id,
          organizationId: org.id,
          oauthApp: { clientId: { startsWith: MARKER } },
        },
      });
    }
    const seedApps = await prisma.oAuthApp.findMany({
      where: { clientId: { startsWith: MARKER } },
      select: { id: true, organizationId: true },
    });
    if (seedApps.length) {
      await prisma.oAuthAuthorization.deleteMany({
        where: { oauthAppId: { in: seedApps.map((a) => a.id) } },
      });
      await prisma.oAuthApp.deleteMany({
        where: { id: { in: seedApps.map((a) => a.id) } },
      });
      await prisma.organization.deleteMany({
        where: {
          id: { in: seedApps.map((a) => a.organizationId) },
          name: { startsWith: `${MARKER}-oauth-` },
        },
      });
    }
  }

  console.log('done — workspace seed removed');
}

async function seed(org, user) {
  const existingChannels = await prisma.integration.findMany({
    where: { organizationId: org.id, internalId: { startsWith: MARKER } },
    select: {
      id: true,
      providerIdentifier: true,
      refreshNeeded: true,
      disabled: true,
    },
  });
  if (existingChannels.length) {
    console.log(
      `${existingChannels.length} seeded channel(s) already on ${org.name} — ` +
        `refreshing approved apps + analytics stubs only. Pass --revoke for a full reseed.`
    );
    await seedApprovedApps(org, user);
    await writeRedisStubs(org.id, existingChannels);
    await seedNotifications(org, user);
    return;
  }

  const sub = await prisma.subscription.findUnique({
    where: { organizationId: org.id },
  });
  if (!sub) {
    console.log(
      `note: ${org.name} has no subscription. Billing may paywall screens.\n` +
        `  node scripts/grant-lifetime.mjs --org ${org.id}`
    );
  } else if (
    sub.totalChannels < CHANNELS.filter((c) => !c.disabled).length &&
    (sub.identifier === 'local-dev' || sub.identifier === 'dev-granted-lifetime')
  ) {
    // Dev entitlements only — never touch a real Stripe row.
    const need = CHANNELS.length;
    console.log(
      `note: raising ${sub.identifier} totalChannels ${sub.totalChannels} → ${need} so seeded channels are not plan-capped`
    );
    if (!dry) {
      await prisma.subscription.update({
        where: { organizationId: org.id },
        data: { totalChannels: need },
      });
    }
  } else if (sub.totalChannels < CHANNELS.filter((c) => !c.disabled).length) {
    console.log(
      `note: subscription allows ${sub.totalChannels} channel(s); seed writes ${CHANNELS.length}. ` +
        `Extras may appear disabled after the next tier sync. Prefer grant-lifetime or a higher tier on a fresh org.`
    );
  }

  console.log(
    `${dry ? '[dry] would seed' : 'seeding'} workspace on ${org.name} (${org.id})` +
      (user ? ` for ${user.email}` : '')
  );

  // —— avatar (also used for every seeded channel picture) ——
  let mediaId = null;
  let channelPictureUrl = null;
  const avatar = await seedAvatarFile();
  if (avatar.missing) {
    process.exitCode = 2;
    return;
  }
  if (avatar.url) {
    channelPictureUrl = avatar.url;
    console.log(`  avatar ← ${avatar.source || avatarArg}`);
    console.log(`  picture URL → ${avatar.url}`);
    if (user && !dry) {
      const media = await prisma.media.create({
        data: {
          name: MEDIA_NAME,
          originalName: avatar.originalName,
          path: avatar.url,
          organizationId: org.id,
          type: 'image',
          fileSize: existsSync(avatar.diskPath)
            ? readFileSync(avatar.diskPath).length
            : 0,
        },
      });
      mediaId = media.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { pictureId: media.id },
      });
    }
  }

  // —— channels ——
  const created = [];
  for (const ch of CHANNELS) {
    const internalId = `${MARKER}-${ch.provider}`;
    const picture = channelPictureUrl;
    console.log(
      `  channel ${ch.provider.padEnd(14)} ${ch.name}` +
        (ch.refreshNeeded ? ' [refreshNeeded]' : '') +
        (ch.disabled ? ' [disabled]' : '')
    );
    if (dry) continue;
    const row = await prisma.integration.create({
      data: {
        internalId,
        organizationId: org.id,
        name: ch.name,
        providerIdentifier: ch.provider,
        type: 'social',
        token: TOKEN,
        picture,
        profile: `@${ch.provider}-dev`,
        refreshNeeded: ch.refreshNeeded,
        disabled: ch.disabled,
      },
    });
    created.push(row);
  }

  const channels = dry
    ? CHANNELS.map((c) => ({
        id: 'dry',
        providerIdentifier: c.provider,
        refreshNeeded: c.refreshNeeded,
        disabled: c.disabled,
      }))
    : created;

  // —— posts ——
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  // Short fixtures for a fresh workspace. For long multi-paragraph bodies
  // (calendar truncation / Create Post overflow QA), also run:
  //   node scripts/seed-dev-posts.mjs --org <id> --reset
  const postRows = [
    [1, 9, 30, 'QUEUE', 'Launch teaser', 'Something new is coming on Friday.'],
    [1, 14, 0, 'QUEUE', 'Community update', 'Notes from this week, in one place.'],
    [2, 8, 15, 'DRAFT', 'Weekly build thread', 'Draft — still deciding the angle.'],
    [2, 17, 45, 'QUEUE', 'Customer story', 'How one team schedules a month ahead.'],
    [-3, 11, 0, 'PUBLISHED', 'Shipped last week', 'What went out and what we learned.'],
    [-5, 16, 20, 'PUBLISHED', 'Behind the scenes', 'A quiet look at how we plan the calendar.'],
    [3, 10, 0, 'DRAFT', 'Sixty second demo', 'Draft — waiting on the recording.'],
    [4, 10, 30, 'QUEUE', 'AMA announcement', 'Ask us anything, Thursday at noon.'],
  ];

  console.log(`  posts: ${postRows.length} across channels`);
  if (!dry) {
    const healthy = channels.filter((c) => !c.disabled);
    for (let i = 0; i < postRows.length; i++) {
      const [day, hour, minute, rowState, title, content] = postRows[i];
      const when = new Date(base);
      when.setDate(when.getDate() + day);
      when.setHours(hour, minute, 0, 0);
      const channel = healthy[i % healthy.length];
      // Aged QUEUE seeds would otherwise sit as Scheduled on past cells.
      const state =
        rowState === 'QUEUE' && when.getTime() <= Date.now()
          ? 'PUBLISHED'
          : rowState;
      await prisma.post.create({
        data: {
          organizationId: org.id,
          integrationId: channel.id,
          state,
          publishDate: when,
          content: `<p>${content}</p>`,
          title,
          group: `${POST_GROUP}-${when.getTime()}-${i}`,
        },
      });
    }
  }

  // —— redis analytics ——
  await writeRedisStubs(org.id, channels);

  // —— approved apps (Settings → Developers) ——
  await seedApprovedApps(org, user);

  // —— notifications (header bell badge + list) ——
  await seedNotifications(org, user);

  // —— settings: webhook + signatures + sets + autopost ——
  if (!dry) {
    const firstHealthy = channels.find((c) => !c.disabled && !c.refreshNeeded);
    const webhook = await prisma.webhooks.create({
      data: {
        name: `${MARKER}-calendar`,
        organizationId: org.id,
        url: 'https://example.com/hooks/dev-seed-ws',
      },
    });
    if (firstHealthy) {
      await prisma.integrationsWebhooks.create({
        data: {
          integrationId: firstHealthy.id,
          webhookId: webhook.id,
        },
      });
    }

    await prisma.signatures.createMany({
      data: [
        {
          organizationId: org.id,
          content: `<p>— Northwind</p><!--${MARKER}-->`,
          autoAdd: true,
        },
        {
          organizationId: org.id,
          content: `<p>Sent with PostQueen</p><!--${MARKER}-->`,
          autoAdd: false,
        },
      ],
    });

    const setContent = (body) =>
      JSON.stringify({
        posts: [
          {
            value: [
              {
                content: `<p>${body}</p>`,
                id: randomBytes(5).toString('hex'),
                media: [],
              },
            ],
          },
        ],
      });

    await prisma.sets.createMany({
      data: [
        {
          organizationId: org.id,
          name: `${MARKER}-launch`,
          content: setContent('Dev seed set — launch angle.'),
        },
        {
          organizationId: org.id,
          name: `${MARKER}-weekly`,
          content: setContent('Dev seed set — weekly update.'),
        },
      ],
    });

    await prisma.autoPost.create({
      data: {
        organizationId: org.id,
        title: `${MARKER}-rss`,
        content: '',
        onSlot: true,
        syncLast: false,
        url: 'https://example.com/feed.xml',
        lastUrl: '',
        active: false,
        addPicture: false,
        generateContent: true,
        integrations: JSON.stringify(
          channels
            .filter((c) => !c.disabled)
            .slice(0, 2)
            .map((c) => ({ id: c.id }))
        ),
      },
    });

    await prisma.thirdParty.create({
      data: {
        organizationId: org.id,
        identifier: 'heygen',
        name: 'Dev Seed HeyGen',
        internalId: `${MARKER}-heygen`,
        apiKey: 'dev-seed-not-a-real-api-key',
      },
    });
  } else {
    console.log(
      '  settings: webhook(+join), 2 signatures, 2 sets, 1 autopost, 1 heygen'
    );
  }

  console.log(
    'done — channels, posts, analytics stubs and settings rows are in place'
  );
  if (mediaId) console.log(`  user.pictureId → ${mediaId}`);
  if (channelPictureUrl) {
    console.log(`  channel pictures → ${channelPictureUrl}`);
  }
}

async function main() {
  const resolved = await resolveOrg();
  if (!resolved) {
    process.exitCode = 2;
    return;
  }
  const { org, user } = resolved;

  if (revoke) {
    await revokeAll(org, user);
    return;
  }

  await seed(org, user);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
