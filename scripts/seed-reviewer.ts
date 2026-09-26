/**
 * postmonster: TikTok App Review account seed (PRD 6.4).
 *
 * Creates (idempotently):
 *   - user reviewer@postmonster.xyz (password from --password / REVIEWER_PASSWORD)
 *   - its own workspace "Reviewer Workspace"
 *   - demo media copied from --media <folder> into the media library
 *
 * The account is excluded from notification/newsletter mailings and no TikTok
 * (or any other) channel is connected - the reviewer connects it live.
 *
 * Run inside the app container (or locally with a .env):
 *   pnpm exec ts-node --transpile-only \
 *     --compiler-options '{"module":"commonjs"}' \
 *     scripts/seed-reviewer.ts --password '...' --media /path/to/demo-media
 *
 * Env fallback: REVIEWER_EMAIL, REVIEWER_PASSWORD, REVIEWER_WORKSPACE,
 * REVIEWER_MEDIA_DIR.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { extname, join } from 'path';
import { PrismaClient, Role } from '@prisma/client';
import { hashSync } from 'bcrypt';

const args = process.argv.slice(2);
const readArg = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index > -1 && args[index + 1] ? args[index + 1] : undefined;
};

const email = (readArg('email') || process.env.REVIEWER_EMAIL || 'reviewer@postmonster.xyz')
  .trim()
  .toLowerCase();
const password = readArg('password') || process.env.REVIEWER_PASSWORD || '';
const workspace =
  readArg('workspace') || process.env.REVIEWER_WORKSPACE || 'Reviewer Workspace';
const mediaDir = readArg('media') || process.env.REVIEWER_MEDIA_DIR || '';

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4']);

// mirrors LocalStorage.newFilePath: /YYYY/MM/DD/<32 hex>.<ext> under
// UPLOAD_DIRECTORY, served as ${FRONTEND_URL}/uploads/...
function newFilePath(uploadDirectory: string, ext: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const innerPath = `/${year}/${month}/${day}`;
  const dir = `${uploadDirectory}${innerPath}`;
  mkdirSync(dir, { recursive: true });

  const randomName = Array(32)
    .fill(null)
    .map(() => Math.round(Math.random() * 16).toString(16))
    .join('');
  const filename = `${randomName}.${ext}`;
  return {
    filename,
    filePath: `${dir}/${filename}`,
    publicPath: `${process.env.FRONTEND_URL}/uploads${innerPath}/${filename}`,
  };
}

async function main() {
  if (!password || password.length < 8) {
    throw new Error('Pass --password (or REVIEWER_PASSWORD), min 8 chars');
  }
  const uploadDirectory = process.env.UPLOAD_DIRECTORY || '';
  if (mediaDir && !uploadDirectory) {
    throw new Error('UPLOAD_DIRECTORY is required to load demo media');
  }
  if (mediaDir && !existsSync(mediaDir)) {
    throw new Error(`Media folder not found: ${mediaDir}`);
  }

  const prisma = new PrismaClient();
  try {
    // ---- user + workspace -------------------------------------------------
    let user = await prisma.user.findFirst({
      where: { email, providerName: 'LOCAL' },
      include: { organizations: true },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          activated: true,
          password: hashSync(password, 10),
          // transactional mail only - no digests, streaks or newsletters
          sendSuccessEmails: false,
          sendFailureEmails: false,
          sendStreakEmails: false,
        },
        include: { organizations: true },
      });
      console.log(`Updated existing user ${email}`);
    } else {
      const organization = await prisma.organization.create({
        data: {
          name: workspace,
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
                  ip: 'seed-reviewer',
                  agent: 'scripts/seed-reviewer.ts',
                  sendSuccessEmails: false,
                  sendFailureEmails: false,
                  sendStreakEmails: false,
                },
              },
            },
          },
        },
        select: {
          id: true,
          users: { select: { user: true } },
        },
      });
      user = await prisma.user.findFirst({
        where: { id: organization.users[0].user.id },
        include: { organizations: true },
      });
      console.log(
        `Created user ${email} with workspace "${workspace}" (${organization.id})`
      );
    }

    let organizationId = user?.organizations[0]?.organizationId;
    if (!organizationId) {
      const organization = await prisma.organization.create({
        data: { name: workspace, allowTrial: true, isTrailing: true },
        select: { id: true },
      });
      organizationId = organization.id;
      await prisma.userOrganization.create({
        data: {
          userId: user!.id,
          organizationId,
          role: Role.SUPERADMIN,
        },
      });
      console.log(`Created workspace "${workspace}" (${organizationId})`);
    }

    // ---- demo media ------------------------------------------------------
    if (!mediaDir) {
      console.log('No --media folder given, skipping demo media');
      return;
    }

    const files = readdirSync(mediaDir).filter((file) =>
      ALLOWED.has(extname(file).toLowerCase())
    );
    if (!files.length) {
      console.log(`No usable media files (jpg/png/webp/gif/mp4) in ${mediaDir}`);
      return;
    }

    for (const file of files) {
      const already = await prisma.media.findFirst({
        where: {
          organizationId,
          originalName: file,
          deletedAt: null,
        },
      });
      if (already) {
        console.log(`Skip (already in library): ${file}`);
        continue;
      }

      const ext = extname(file).toLowerCase().slice(1);
      const { filename, filePath, publicPath } = newFilePath(
        uploadDirectory,
        ext
      );
      copyFileSync(join(mediaDir, file), filePath);
      const fileSize = statSync(filePath).size;

      await prisma.media.create({
        data: {
          organizationId,
          name: filename,
          originalName: file,
          path: publicPath,
          fileSize,
          type: ext === 'mp4' ? 'video' : 'image',
          status: 'ready',
        },
      });
      console.log(`Loaded demo media: ${file} -> ${publicPath}`);
    }

    console.log('Done. TikTok is NOT connected - the reviewer connects it live.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
