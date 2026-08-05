#!/usr/bin/env node
//
// Puts a handful of posts on a development calendar so the surfaces that only
// exist once there is something scheduled can be looked at.
//
//   node scripts/seed-dev-posts.mjs --org <id> --dry
//   node scripts/seed-dev-posts.mjs --org <id>
//   node scripts/seed-dev-posts.mjs --org <id> --revoke
//
// What it unblocks: where a card sits inside its hour cell, drag and drop, the
// posts panel with real rows in all three tabs, and the channel counters
// reading something other than zero. Every one of those was built during this
// migration and none has been seen with a post in place.
//
// It attaches to the channel `seed-dev-channel.mjs` wrote, whose token is
// deliberately invalid, so **nothing here can publish**. A QUEUE post whose
// time passes will be picked up by the worker and fail at the provider, which
// is the correct outcome for a channel that was never authorised — but it is
// also noise, so the scheduled ones are placed in the future and the rest are
// drafts.
//
// `--revoke` removes exactly what it wrote and nothing else.
//
// NOT FOR PRODUCTION.
import { PrismaClient } from '@prisma/client';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const dry = process.argv.includes('--dry');
const revoke = process.argv.includes('--revoke');
const orgId = arg('org');

const GROUP = 'dev-seed-posts';

// Spread across the working week at hours a person would actually pick, so the
// grid is being judged on a realistic distribution rather than six cards in one
// column. Offsets are days from today; hours are local.
const ROWS = [
  [1, 9, 30, 'QUEUE', 'Launch teaser', 'Something new is coming on Friday.'],
  [1, 14, 0, 'QUEUE', 'Community update', 'Notes from this week, in one place.'],
  [2, 8, 15, 'DRAFT', 'Weekly build thread', 'Draft — still deciding the angle.'],
  [2, 17, 45, 'QUEUE', 'Customer story', 'How one team schedules a month ahead.'],
  [3, 11, 0, 'DRAFT', 'Sixty second demo', 'Draft — waiting on the recording.'],
  [4, 10, 30, 'QUEUE', 'AMA announcement', 'Ask us anything, Thursday at noon.'],
];

const prisma = new PrismaClient();

async function main() {
  if (!orgId) {
    console.error('--org <id> is required.');
    process.exitCode = 2;
    return;
  }

  if (revoke) {
    // `startsWith`, because each post gets its own group below — the calendar
    // reads a shared group as one post split across channels, and these are six
    // separate posts, not one posted six times.
    const where = { organizationId: orgId, group: { startsWith: GROUP } };
    const { count } = dry
      ? { count: await prisma.post.count({ where }) }
      : await prisma.post.deleteMany({ where });
    console.log(`${dry ? '[dry] would delete' : 'deleted'} ${count} seeded post(s)`);
    return;
  }

  const channel = await prisma.integration.findFirst({
    where: { organizationId: orgId, internalId: 'dev-seed' },
  });
  if (!channel) {
    console.error(
      'No seeded channel on this organization. Run seed-dev-channel.mjs first — ' +
        'these posts attach to it precisely so they cannot publish.'
    );
    process.exitCode = 2;
    return;
  }

  const already = await prisma.post.count({
    where: { organizationId: orgId, group: { startsWith: GROUP } },
  });
  if (already) {
    console.log(`${already} seeded post(s) already here — nothing to do.`);
    return;
  }

  const base = new Date();
  base.setHours(0, 0, 0, 0);

  const rows = ROWS.map(([day, hour, minute, state, title, content]) => {
    const when = new Date(base);
    when.setDate(when.getDate() + day);
    when.setHours(hour, minute, 0, 0);
    return { when, state, title, content };
  });

  console.log(
    `${dry ? '[dry] would add' : 'adding'} ${rows.length} posts to ${channel.name}:`
  );
  for (const r of rows) {
    console.log(`  ${r.when.toISOString().slice(0, 16).replace('T', ' ')}  ${r.state.padEnd(6)}  ${r.title}`);
  }
  if (dry) return;

  for (const r of rows) {
    await prisma.post.create({
      data: {
        organizationId: orgId,
        integrationId: channel.id,
        state: r.state,
        publishDate: r.when,
        content: `<p>${r.content}</p>`,
        title: r.title,
        // One group per post: the calendar treats a shared group as one post
        // split across channels, and these are six separate posts.
        group: `${GROUP}-${r.when.getTime()}`,
      },
    });
  }

  console.log('done — the calendar, posts panel and channel counters now have something in them');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
