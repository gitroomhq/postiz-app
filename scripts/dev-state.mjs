#!/usr/bin/env node
//
// Puts a development organization into any (tier, trial, lifetime) combination,
// so the gates that differ between them can be walked instead of reasoned about.
//
//   node scripts/dev-state.mjs --org <id> --tier GROWTH --trial --dry
//   node scripts/dev-state.mjs --org <id> --tier CREATOR --lifetime
//   node scripts/dev-state.mjs --org <id> --created-days-ago 8
//   node scripts/dev-state.mjs --org <id> --show
//   node scripts/dev-state.mjs --org <id> --reset
//
// `--created-days-ago N` moves the organization's registration date, which is
// the only thing `trialWindow()` reads. It is how the seventh day is reached
// without waiting a week: day 1 and day 6 are inside the trial, day 8 is past
// it, and the app has to agree at each point.
//
// Why it exists: every screen in this migration had been looked at on one
// account, in one state. The tiers differ in ways that are visible —
//
//   CREATOR   5 channels    no Teams, no Auto Post, no image generator
//   GROWTH   10 channels    all three
//   PRO      30 channels    all three
//   AGENCY   unlimited      all three
//
// — so two Settings tabs disappear on CREATOR and the composer's AI image
// controls go with them, and none of that had been seen.
//
// It writes the same subscription row `grant-lifetime.mjs` writes, identified
// the same way, so this is not a fifth path to a subscription. `--reset` puts
// the organization back to lifetime CREATOR + trial, which is where this
// session's seeding left it.
//
// NOT FOR PRODUCTION.
import { PrismaClient } from '@prisma/client';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};
const has = (name) => process.argv.includes(`--${name}`);

const dry = has('dry');
const orgId = arg('org');

const CHANNELS = { CREATOR: 5, GROWTH: 10, PRO: 30, AGENCY: 1000000 };
const IDENTIFIER = 'dev-granted-lifetime';

const prisma = new PrismaClient();

const TRIAL_DAYS = 7;

async function show() {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, isTrailing: true, allowTrial: true, createdAt: true },
  });
  const sub = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
    select: { subscriptionTier: true, totalChannels: true, isLifetime: true, cancelAt: true },
  });
  const age = org?.createdAt
    ? (Date.now() - org.createdAt.getTime()) / 86400000
    : NaN;
  console.log(
    `  ${org?.name}: ${sub ? sub.subscriptionTier : 'no subscription'}` +
      `${sub ? ` · ${sub.totalChannels} channels` : ''}` +
      `${sub?.isLifetime ? ' · lifetime' : ''}` +
      `${sub?.cancelAt ? ' · cancelling' : ''}` +
      ` · trial=${org?.isTrailing} · allowTrial=${org?.allowTrial}`
  );
  // The stored flag and the derived one, side by side — they disagree once the
  // seventh day passes, and that disagreement is the whole point.
  console.log(
    `  created ${age.toFixed(1)} days ago · trial window ${
      age < TRIAL_DAYS ? `open, ${(TRIAL_DAYS - age).toFixed(1)} days left` : 'closed'
    }`
  );
}

async function main() {
  if (!orgId) {
    console.error('--org <id> is required.');
    process.exitCode = 2;
    return;
  }

  const daysAgo = arg('created-days-ago');
  if (daysAgo !== undefined) {
    const when = new Date(Date.now() - parseFloat(daysAgo) * 86400000);
    console.log(
      `${dry ? '[dry] would move' : 'moving'} registration to ${when.toISOString()}`
    );
    if (!dry) {
      await prisma.organization.update({
        where: { id: orgId },
        data: { createdAt: when },
      });
    }
    if (!has('tier') && !has('reset') && !has('none')) return show();
  }

  if (has('show')) return show();

  const reset = has('reset');
  const tier = reset ? 'CREATOR' : arg('tier');
  const lifetime = reset || has('lifetime');
  const trial = reset || has('trial');
  const none = !reset && has('none');

  if (!tier && !none) {
    console.error('--tier <CREATOR|GROWTH|PRO|AGENCY>, or --none, or --reset.');
    process.exitCode = 2;
    return;
  }

  console.log(
    `${dry ? '[dry] would set' : 'setting'} ` +
      (none ? 'no subscription' : `${tier} · ${CHANNELS[tier]} channels`) +
      `${lifetime ? ' · lifetime' : ''} · trial=${trial}`
  );
  if (dry) return show();

  const existing = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
  });
  if (existing && existing.identifier !== IDENTIFIER) {
    console.error(
      `Refusing: this organization has a subscription this tooling did not write ` +
        `(identifier ${existing.identifier ?? 'null'}).`
    );
    process.exitCode = 2;
    return;
  }

  if (none) {
    await prisma.subscription.deleteMany({ where: { organizationId: orgId, identifier: IDENTIFIER } });
  } else {
    const data = {
      subscriptionTier: tier,
      totalChannels: CHANNELS[tier],
      isLifetime: lifetime,
      identifier: IDENTIFIER,
      cancelAt: null,
      deletedAt: null,
    };
    await prisma.subscription.upsert({
      where: { organizationId: orgId },
      update: data,
      create: { ...data, organizationId: orgId, period: 'MONTHLY' },
    });
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: { isTrailing: trial, ...(reset ? { allowTrial: true } : {}) },
  });

  await show();
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
