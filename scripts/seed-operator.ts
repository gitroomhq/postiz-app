/**
 * postmonster: one-off bootstrap of the operator super admin account (PRD 6).
 *
 * With DISABLE_REGISTRATION=true nothing registers without an invite, so the
 * very first super admin is created by this script instead of the upstream
 * "first organization" registration window. Idempotent: safe to re-run, the
 * password only changes when it is passed explicitly.
 *
 * Run inside the app container (or locally with a .env):
 *   pnpm exec ts-node --transpile-only \
 *     --compiler-options '{"module":"commonjs"}' \
 *     scripts/seed-operator.ts --email you@postmonster.xyz --password '...'
 *
 * Env fallback: OPERATOR_EMAIL, OPERATOR_PASSWORD, OPERATOR_WORKSPACE.
 */
import { randomInt } from 'crypto';
import { PrismaClient, Role } from '@prisma/client';
import { hashSync } from 'bcrypt';
// relative import on purpose: runs standalone through ts-node without the
// @gitroom path aliases; the helper only uses plain npm imports
import { AuthService } from '../libraries/helpers/src/auth/auth.service';

const args = process.argv.slice(2);
const readArg = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index > -1 && args[index + 1] ? args[index + 1] : undefined;
};

const email = (readArg('email') || process.env.OPERATOR_EMAIL || '')
  .trim()
  .toLowerCase();
const password = readArg('password') || process.env.OPERATOR_PASSWORD || '';
const workspace =
  readArg('workspace') || process.env.OPERATOR_WORKSPACE || 'Postmonster';

const makeSecureId = (length: number) => {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i += 1) {
    text += possible.charAt(randomInt(possible.length));
  }
  return text;
};

async function main() {
  if (!email || !email.includes('@')) {
    throw new Error('Pass --email (or OPERATOR_EMAIL)');
  }
  if (!password || password.length < 8) {
    throw new Error('Pass --password (or OPERATOR_PASSWORD), min 8 chars');
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findFirst({
      where: { email, providerName: 'LOCAL' },
      include: { organizations: true },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          isSuperAdmin: true,
          activated: true,
          password: hashSync(password, 10),
        },
      });

      let organizationId = existing.organizations[0]?.organizationId;
      if (!organizationId) {
        const organization = await prisma.organization.create({
          data: {
            name: workspace,
            apiKey: AuthService.fixedEncryption(makeSecureId(20)),
            allowTrial: true,
            isTrailing: true,
          },
          select: { id: true },
        });
        organizationId = organization.id;
        await prisma.userOrganization.create({
          data: {
            userId: existing.id,
            organizationId,
            role: Role.SUPERADMIN,
          },
        });
      }
      console.log(
        `Updated existing user ${email} (super admin, activated, password reset)`
      );
      console.log(`Workspace: ${organizationId}`);
      return;
    }

    const organization = await prisma.organization.create({
      data: {
        name: workspace,
        apiKey: AuthService.fixedEncryption(makeSecureId(20)),
        allowTrial: true,
        isTrailing: true,
        users: {
          create: {
            role: Role.SUPERADMIN,
            user: {
              create: {
                email,
                password: hashSync(password, 10),
                providerName: 'LOCAL',
                providerId: '',
                timezone: 0,
                activated: true,
                isSuperAdmin: true,
                ip: 'seed-operator',
                agent: 'scripts/seed-operator.ts',
              },
            },
          },
        },
      },
      select: { id: true, name: true },
    });

    console.log(`Created user ${email} (super admin)`);
    console.log(`Workspace "${organization.name}" (${organization.id})`);
    console.log('Done. Log in at /auth/login with this email and password.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
