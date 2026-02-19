import { PostgresStore, PgVector } from '@mastra/pg';

// In desktop/PGlite mode DATABASE_URL is a file:// path, not a real PostgreSQL
// connection string. @mastra/pg's PostgresStore uses the standard pg driver and
// cannot connect to PGlite. Only construct the store when DATABASE_URL is an
// actual PostgreSQL URL; otherwise export undefined so Mastra uses its default
// in-memory storage.
const isPostgresUrl =
  typeof process.env.DATABASE_URL === 'string' &&
  (process.env.DATABASE_URL.startsWith('postgresql://') ||
    process.env.DATABASE_URL.startsWith('postgres://'));

export const pStore = isPostgresUrl
  ? new PostgresStore({ connectionString: process.env.DATABASE_URL })
  : undefined;
