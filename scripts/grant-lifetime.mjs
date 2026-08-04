#!/usr/bin/env node
//
// Grants (or revokes) a lifetime subscription on a development database, so the
// founding-member surfaces and the lifetime billing rules can actually be seen.
//
//   node scripts/grant-lifetime.mjs --org <id> --dry
//   node scripts/grant-lifetime.mjs --org <id>
//   node scripts/grant-lifetime.mjs --org <id> --revoke
//
// Why this exists: with billing on and no subscription, a FREE tier replaces
// the whole app shell with the checkout paywall on every route. Eight of the
// ten signed-in screens cannot be photographed, and neither can the
// founding-member block, the rail's hidden Upgrade row, or the `{Tier} tier`
// label on the channels column. All of those read a subscription row.
//
// It writes the same row `StripeService.grantLifetimeFromPayment` writes — same
// tier ladder, same isLifetime — so this does not become a third way to become
// a lifetime member that can drift from the other two.
//
// `--revoke` puts it back. A script that cannot undo itself is a script nobody
// should run against a database they care about, and this one runs against the
// owner's own dev data.
//
// NOT FOR PRODUCTION. It fabricates an entitlement nobody paid for. The
// identifier it writes says so, in the row itself, so anyone finding it later
// knows what it is.
import { PrismaClient } from '@prisma/client';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const dry = process.argv.includes('--dry');
const revoke = process.argv.includes('--revoke');
// --tier <TIER> overrides the ladder. It exists because this database's enum
// may not know the renamed tiers yet: `prisma db push` has never run here, so
// Postgres rejects CREATOR/GROWTH/AGENCY outright with
//   invalid input value for enum "SubscriptionTier": "CREATOR"
// Passing PRO — a value the enum has always had — unblocks the screens without
// pushing a schema change to somebody's development database as a side effect
// of wanting to take a screenshot.
const tierOverride = arg('tier');
const orgId = arg('org');

// The ladder, kept identical to `lifetimeLadder` in pricing.ts. Duplicated
// rather than imported because this is a plain node script with no TS build
// step; if the two ever disagree, pricing.ts is right.
const LADDER = {
  FREE: 'CREATOR',
  CREATOR: 'GROWTH',
  STANDARD: 'GROWTH',
  GROWTH: 'PRO',
  TEAM: 'PRO',
  PRO: 'AGENCY',
  ULTIMATE: 'AGENCY',
  AGENCY: 'AGENCY',
};

const CHANNELS = {
  CREATOR: 5,
  GROWTH: 10,
  PRO: 30,
  AGENCY: 1000000,
};

const IDENTIFIER = 'dev-granted-lifetime';

const prisma = new PrismaClient();

async function main() {
  if (!orgId) {
    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true },
      take: 10,
    });
    console.error('--org <id> is required. Organizations on this database:\n');
    for (const o of orgs) console.error(`  ${o.id}  ${o.name}`);
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

  const existing = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
  });

  if (revoke) {
    if (!existing) {
      console.log(`${org.name} has no subscription — nothing to revoke.`);
      return;
    }
    if (existing.identifier !== IDENTIFIER) {
      // Refusing is the whole point: a real subscription deleted by a helper
      // script is not something an --revoke flag should be able to do.
      console.error(
        `Refusing: ${org.name}'s subscription was not written by this script ` +
          `(identifier ${existing.identifier ?? 'null'}). Remove it by hand if that is what you mean.`
      );
      process.exitCode = 2;
      return;
    }
    console.log(
      `${dry ? '[dry] would delete' : 'deleting'} the granted lifetime row for ${org.name}`
    );
    if (!dry) {
      await prisma.subscription.delete({ where: { organizationId: orgId } });
    }
    return;
  }

  if (existing && existing.identifier !== IDENTIFIER) {
    console.error(
      `Refusing: ${org.name} already has a subscription this script did not write ` +
        `(${existing.subscriptionTier}, identifier ${existing.identifier ?? 'null'}).`
    );
    process.exitCode = 2;
    return;
  }

  const current = existing?.subscriptionTier ?? 'FREE';
  const next = tierOverride || LADDER[current] || 'CREATOR';
  // At the top of the ladder a further grant buys channels instead of a tier,
  // which is what the redemption path does.
  const channels =
    existing && next === current
      ? existing.totalChannels + 5
      : CHANNELS[next] ?? 5;

  console.log(
    `${dry ? '[dry] would grant' : 'granting'} lifetime to ${org.name}: ` +
      `${current} -> ${next}, ${channels} channels`
  );

  if (dry) return;

  await prisma.subscription.upsert({
    where: { organizationId: orgId },
    update: {
      subscriptionTier: next,
      totalChannels: channels,
      isLifetime: true,
      identifier: IDENTIFIER,
      deletedAt: null,
    },
    create: {
      organizationId: orgId,
      subscriptionTier: next,
      totalChannels: channels,
      isLifetime: true,
      identifier: IDENTIFIER,
      period: 'MONTHLY',
    },
  });

  console.log('done — /user/self should now report isLifetime: true');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
