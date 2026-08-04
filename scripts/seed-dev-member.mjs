#!/usr/bin/env node
//
// Adds a non-admin member to an organization on a development database, so the
// screens that only a non-admin can see can be looked at.
//
//   node scripts/seed-dev-member.mjs --org <id> --dry
//   node scripts/seed-dev-member.mjs --org <id>
//   node scripts/seed-dev-member.mjs --org <id> --revoke
//
// What it unblocks: doc 03's `member_no_plan` — no subscription and not an
// admin, which renders `BillingAdminRequiredComponent` instead of the checkout
// paywall. Every other state in that table has now been seen; this one needs a
// second person in the room, and there has only ever been one.
//
// The account is deliberately unusable as a login: no password is set, so it
// can be reached only by using its id directly. It exists to be *rendered as*,
// not to be signed in as by a person.
//
// `--revoke` removes the membership and the user, and refuses anything it did
// not write.
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

const EMAIL = 'dev-seed-member@postqueen.invalid';

const prisma = new PrismaClient();

async function main() {
  if (!orgId) {
    console.error('--org <id> is required.');
    process.exitCode = 2;
    return;
  }

  const existing = await prisma.user.findFirst({ where: { email: EMAIL } });

  if (revoke) {
    if (!existing) {
      console.log('No seeded member — nothing to remove.');
      return;
    }
    console.log(`${dry ? '[dry] would remove' : 'removing'} the seeded member`);
    if (!dry) {
      await prisma.userOrganization.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }
    return;
  }

  if (existing) {
    console.log('Seeded member already here — nothing to do.');
    return;
  }

  console.log(
    `${dry ? '[dry] would add' : 'adding'} ${EMAIL} to the organization as USER`
  );
  if (dry) return;

  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      // The `.invalid` TLD is reserved by RFC 2606 precisely so it can never
      // resolve, and no password is set — this row is for rendering, not for
      // signing in.
      name: 'Dev seed member',
      providerName: 'LOCAL',
      providerId: 'dev-seed-member',
      activated: true,
      timezone: 0,
    },
  });

  await prisma.userOrganization.create({
    data: { userId: user.id, organizationId: orgId, role: 'USER' },
  });

  console.log(`done — user id ${user.id}`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
