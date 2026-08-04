#!/usr/bin/env node
//
// Writes a placeholder channel on a development database so the surfaces that
// only exist once a channel is connected can be looked at.
//
//   node scripts/seed-dev-channel.mjs --org <id> --dry
//   node scripts/seed-dev-channel.mjs --org <id>
//   node scripts/seed-dev-channel.mjs --org <id> --revoke
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

  const existing = await prisma.integration.findFirst({
    where: { organizationId: orgId, internalId: INTERNAL },
  });

  if (revoke) {
    if (!existing) {
      console.log('Nothing seeded on this organization — nothing to remove.');
      return;
    }
    console.log(
      `${dry ? '[dry] would delete' : 'deleting'} the seeded ${existing.providerIdentifier} channel`
    );
    if (!dry) {
      await prisma.integration.delete({ where: { id: existing.id } });
    }
    return;
  }

  if (existing) {
    console.log(
      `${org.name} already has a seeded channel (${existing.providerIdentifier}) — nothing to do.`
    );
    return;
  }

  console.log(
    `${dry ? '[dry] would add' : 'adding'} a placeholder ${provider} channel to ${org.name}`
  );
  if (dry) return;

  await prisma.integration.create({
    data: {
      internalId: INTERNAL,
      organizationId: orgId,
      // The name says what it is, in the one place somebody will definitely
      // see it: the channel list.
      name: 'Dev placeholder (not connected)',
      providerIdentifier: provider,
      type: 'social',
      token: TOKEN,
    },
  });

  console.log('done — the calendar, composer and channel detail now have a channel');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
