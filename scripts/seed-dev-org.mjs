#!/usr/bin/env node
//
// Gives a development user a second organization, so the workspace switcher can
// be looked at.
//
//   node scripts/seed-dev-org.mjs --user <email> --dry
//   node scripts/seed-dev-org.mjs --user <email>
//   node scripts/seed-dev-org.mjs --user <email> --revoke
//
// What it unblocks: `organization.selector.tsx:89` returns null unless the
// account belongs to more than one organization — `if (!(data?.length > 1))`.
// Every account on this database has exactly one, so the switcher has never
// rendered, and neither has anything downstream of switching: the `showorg`
// cookie, the header the API reads it from, or the reload that follows.
//
// The organization it writes is empty on purpose — no channels, no posts, no
// subscription. Switching into it is the FREE-tier, nothing-connected state,
// which is also worth seeing at least once.
//
// `--revoke` removes it and refuses anything it did not write.
//
// NOT FOR PRODUCTION.
import { PrismaClient } from '@prisma/client';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const dry = process.argv.includes('--dry');
const revoke = process.argv.includes('--revoke');
const email = arg('user');

const NAME = 'Second workspace (dev seed)';

const prisma = new PrismaClient();

async function main() {
  if (!email) {
    console.error('--user <email> is required.');
    process.exitCode = 2;
    return;
  }

  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    console.error(`No user ${email} on this database.`);
    process.exitCode = 2;
    return;
  }

  const existing = await prisma.organization.findFirst({
    where: { name: NAME, users: { some: { userId: user.id } } },
  });

  if (revoke) {
    if (!existing) {
      console.log('Nothing seeded for this user — nothing to remove.');
      return;
    }
    console.log(`${dry ? '[dry] would delete' : 'deleting'} "${NAME}"`);
    if (!dry) {
      await prisma.userOrganization.deleteMany({
        where: { organizationId: existing.id },
      });
      await prisma.organization.delete({ where: { id: existing.id } });
    }
    return;
  }

  if (existing) {
    console.log(`"${NAME}" already here (${existing.id}) — nothing to do.`);
    return;
  }

  console.log(
    `${dry ? '[dry] would add' : 'adding'} "${NAME}" and put ${email} in it as SUPERADMIN`
  );
  if (dry) return;

  const org = await prisma.organization.create({
    data: {
      name: NAME,
      users: { create: { userId: user.id, role: 'SUPERADMIN' } },
    },
  });

  console.log(`done — org id ${org.id}; the workspace switcher now has two entries`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
