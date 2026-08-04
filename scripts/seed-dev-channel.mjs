#!/usr/bin/env node
//
// Writes a placeholder channel on a development database so the surfaces that
// only exist once a channel is connected can be looked at.
//
//   node scripts/seed-dev-channel.mjs --org <id> --dry
//   node scripts/seed-dev-channel.mjs --org <id>
//   node scripts/seed-dev-channel.mjs --org <id> --count 6 --disable-over 5
//   node scripts/seed-dev-channel.mjs --org <id> --revoke
//
// `--count N` writes N of them, and `--disable-over K` sets `disabled` on
// everything past the Kth — which is the state a downgrade leaves behind.
// `subscription.service.ts:82` calls `disableIntegrations()` when the new tier
// holds fewer channels than are connected, and the channel column then draws
// those rows at half opacity with an "upgrade your plan" tooltip. Nothing in
// this migration had ever seen that; a one-channel account cannot produce it.
//
// What it unblocks: the composer, a populated calendar, drag and drop, the
// channel detail pane, and the posting-times editor. All of those were written
// during this migration and none has been seen with a channel in place.
//
// NOT A WORKING CHANNEL, and the row says so. Its token is the literal string
// below, so any publish attempt fails at the provider rather than half-working.
// Nothing schedules a post by itself, so nothing will try — but if you schedule
// one against this channel it will fail, and that is the correct outcome for a
// channel that was never authorised.
//
// `--revoke` removes it, and refuses to remove anything it did not write.
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
// Mastodon by default: the provider with the least ceremony, and one whose
// preview and composer behaviour is unexceptional, so what is being looked at
// is the app rather than a provider's quirks.
const provider = arg('provider') || 'mastodon';
const total = parseInt(arg('count') || '1', 10);
const disableOver = parseInt(arg('disable-over') || '0', 10);

const TOKEN = 'dev-seed-not-a-real-token';
const INTERNAL = 'dev-seed';

const prisma = new PrismaClient();

async function main() {
  if (!orgId) {
    console.error('--org <id> is required.');
    process.exitCode = 2;
    return;
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  });
  if (!org) {
    console.error(`No organization ${orgId} on this database.`);
    process.exitCode = 2;
    return;
  }

  // The first one keeps the original id so posts seeded against `dev-seed`
  // still attach; the rest are numbered.
  const idFor = (i) => (i === 0 ? INTERNAL : `${INTERNAL}-${i + 1}`);
  const nameFor = (i) =>
    i === 0
      ? 'Dev placeholder (not connected)'
      : `Dev placeholder ${i + 1} (not connected)`;

  const existing = await prisma.integration.findMany({
    where: { organizationId: orgId, internalId: { startsWith: INTERNAL } },
    orderBy: { createdAt: 'asc' },
  });

  if (revoke) {
    // `--keep N` leaves the first N in place: the posts seeded by
    // seed-dev-posts.mjs hang off the first channel, and deleting it takes them
    // with it. Winding six channels back down to one is the usual case.
    const keep = parseInt(arg('keep') || '0', 10);
    const doomed = existing.slice(keep);
    if (!doomed.length) {
      console.log(
        existing.length
          ? `${existing.length} seeded channel(s), keeping ${keep} — nothing to remove.`
          : 'Nothing seeded on this organization — nothing to remove.'
      );
      return;
    }
    console.log(
      `${dry ? '[dry] would delete' : 'deleting'} ${doomed.length} seeded channel(s): ` +
        doomed.map((d) => d.name).join(', ')
    );
    if (!dry) {
      await prisma.integration.deleteMany({
        where: { id: { in: doomed.map((d) => d.id) } },
      });
    }
    return;
  }

  const missing = [];
  for (let i = 0; i < total; i++) {
    if (!existing.some((e) => e.internalId === idFor(i))) missing.push(i);
  }

  console.log(
    `${dry ? '[dry] would add' : 'adding'} ${missing.length} placeholder ${provider} channel(s) to ${org.name}` +
      ` (${existing.length} already here)`
  );
  if (dry) return;

  for (const i of missing) {
    await prisma.integration.create({
      data: {
        internalId: idFor(i),
        organizationId: orgId,
        // The name says what it is, in the one place somebody will definitely
        // see it: the channel list.
        name: nameFor(i),
        providerIdentifier: provider,
        type: 'social',
        token: TOKEN,
      },
    });
  }

  if (disableOver) {
    // Mirrors what a downgrade leaves behind: everything past the tier's limit
    // carries `disabled`, and the column halves its opacity.
    const all = await prisma.integration.findMany({
      where: { organizationId: orgId, internalId: { startsWith: INTERNAL } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    });
    const over = all.slice(disableOver);
    await prisma.integration.updateMany({
      where: { id: { in: over.map((o) => o.id) } },
      data: { disabled: true },
    });
    await prisma.integration.updateMany({
      where: { id: { in: all.slice(0, disableOver).map((o) => o.id) } },
      data: { disabled: false },
    });
    console.log(
      `  over the limit of ${disableOver}: ${over.map((o) => o.name).join(', ') || '(none)'}`
    );
  }

  console.log('done — the calendar, composer and channel detail now have channels');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
