#!/usr/bin/env node
//
// Moves live subscriptions off the retired tier names onto the ones now on sale:
//
//   STANDARD -> CREATOR      TEAM -> GROWTH      ULTIMATE -> AGENCY
//
// PRO kept its name and is not touched.
//
// Why a script and not a Prisma migration: the deploy path is
// `prisma db push --accept-data-loss` (package.json `prisma-apply`, unless
// PRISMA_MIGRATE is set), which never runs anything in `migrations/`. A
// migration file here would look right, be committed, and silently never
// execute.
//
// Why not a `nestjs-command` task, which is where one-off jobs belong: the
// commands app does not boot. `agent.run.ts` calls `AgentGraphService.createGraph`,
// which no longer exists, so it fails to build; and `CommandModule` does not
// import a Temporal module, so DatabaseModule's NotificationService cannot be
// injected. Both predate this work. Once they are fixed this belongs there.
//
// PREREQUISITE: the database's enum must already know CREATOR / GROWTH /
// AGENCY. They were added to schema.prisma but a schema is not a database —
// until `prisma db push` runs, Postgres rejects them outright:
//
//   invalid input value for enum "SubscriptionTier": "CREATOR"
//
// A normal deploy handles this: `pm2-run` runs `prisma-apply` before it starts
// anything. Run this script after that, never before.
//
// It is safe to run twice — after the first run the retired tiers match nothing.
// It is also safe never to run: the old enum values are permanent, so an
// unmigrated row keeps working. What it changes is which plan name a customer's
// subscription reports, and therefore which pricing entry the app looks up.
//
//   node scripts/migrate-tiers.mjs --dry     report what would move
//   node scripts/migrate-tiers.mjs           move it
//
// Reads DATABASE_URL from the environment, so run it the way the app runs:
//   node_modules/.bin/dotenv -e .env -- node scripts/migrate-tiers.mjs --dry

import { PrismaClient } from '@prisma/client';

const MOVES = [
  ['STANDARD', 'CREATOR'],
  ['TEAM', 'GROWTH'],
  ['ULTIMATE', 'AGENCY'],
];

const dry = process.argv.includes('--dry');
const prisma = new PrismaClient();

const counts = async () => {
  const rows = await prisma.subscription.groupBy({
    by: ['subscriptionTier'],
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.subscriptionTier, r._count._all]));
};

const report = (label, tally) => {
  const entries = Object.entries(tally).sort();
  console.log(`\n${label}:`);
  if (!entries.length) console.log('  (no subscriptions)');
  for (const [tier, n] of entries) console.log(`  ${tier.padEnd(10)} ${n}`);
  return Object.values(tally).reduce((a, b) => a + b, 0);
};

try {
  const before = await counts();
  const totalBefore = report('before', before);

  if (dry) {
    const pending = MOVES.filter(([from]) => before[from] > 0);
    console.log('');
    if (!pending.length) {
      console.log('Nothing to move.');
    } else {
      for (const [from, to] of pending) {
        console.log(`  would move ${before[from]} × ${from} -> ${to}`);
      }
    }
    console.log('\nDry run — nothing was changed.');
    process.exit(0);
  }

  console.log('');
  for (const [from, to] of MOVES) {
    const { count } = await prisma.subscription.updateMany({
      where: { subscriptionTier: from },
      data: { subscriptionTier: to },
    });
    if (count) console.log(`  moved ${count} × ${from} -> ${to}`);
  }

  const totalAfter = report('after', await counts());

  // Tiers are meant to move between the two tallies. The total is not.
  if (totalBefore !== totalAfter) {
    console.error(
      `\nSubscription count changed: ${totalBefore} -> ${totalAfter}. ` +
        `That should be impossible — investigate before deploying anything else.`
    );
    process.exit(1);
  }
  console.log(`\n${totalAfter} subscriptions, all accounted for.`);
} finally {
  await prisma.$disconnect();
}
