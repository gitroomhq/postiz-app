import { PrismaClient } from '@prisma/client';

let client: PrismaClient | undefined;

export function testPrisma(): PrismaClient {
  client ??= new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

  return client;
}

export async function disconnectTestPrisma() {
  await client?.$disconnect();
  client = undefined;
}

/**
 * Refuse to touch anything that is not obviously a test database.
 *
 * This lives here rather than in a setup file because resetDatabase has two
 * callers and only one of them loads vitest's integration setup: Playwright's
 * global setup calls it directly, with DATABASE_URL taken from the developer's
 * shell. Guarding the function protects both.
 */
export function assertTestDatabase(url = process.env.DATABASE_URL) {
  if (!url) {
    throw new Error(
      'DATABASE_URL is required. Start infrastructure with `pnpm run dev:docker` ' +
        'and point at a dedicated test database.'
    );
  }

  if (!/(^|[^a-z])test([^a-z]|$)/i.test(url)) {
    throw new Error(
      `Refusing to operate on ${url}: the database name must contain "test". ` +
        'resetDatabase truncates every table, and schema setup uses ' +
        '`prisma db push --accept-data-loss`.'
    );
  }
}

let truncateStatement: string | undefined;

/**
 * Empty every table between tests.
 *
 * A single TRUNCATE ... CASCADE is one round-trip and is insensitive to
 * foreign-key ordering, where a deleteMany per model would be ~50 round-trips
 * in a dependency order that has to be maintained by hand as the schema grows.
 * CLAUDE.md's "never use raw SQL" rule is about production query paths; this is
 * test-only teardown and never ships.
 *
 * The table list is read from pg_tables rather than from Prisma's DMMF so that
 * @@map'd names and implicitly generated many-to-many join tables are covered.
 */
export async function resetDatabase(prisma: PrismaClient = testPrisma()) {
  assertTestDatabase();

  if (!truncateStatement) {
    const rows = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;

    const tables = rows
      .map((row) => row.tablename)
      .filter((name) => name !== '_prisma_migrations')
      .map((name) => `"public"."${name}"`);

    if (!tables.length) {
      throw new Error(
        'No tables found in the test database. Run `prisma db push` against ' +
          'DATABASE_URL before running integration tests.'
      );
    }

    truncateStatement = `TRUNCATE TABLE ${tables.join(
      ', '
    )} RESTART IDENTITY CASCADE`;
  }

  await prisma.$executeRawUnsafe(truncateStatement);
}
