import { PostgresStore, PgVector } from '@mastra/pg';

// In desktop/PGlite mode DATABASE_URL starts with "postgresql://" but has a
// "pglite=" query param — it is NOT a real TCP PostgreSQL server. @mastra/pg's
// PostgresStore uses the standard pg driver and cannot connect to PGlite.
// Only construct the store for real PostgreSQL URLs (no pglite param);
// otherwise export undefined so Mastra uses its default in-memory storage.
const isPostgresUrl =
  typeof process.env.DATABASE_URL === 'string' &&
  (process.env.DATABASE_URL.startsWith('postgresql://') ||
    process.env.DATABASE_URL.startsWith('postgres://')) &&
  !process.env.DATABASE_URL.includes('pglite=');

export const pStore = isPostgresUrl
  ? new PostgresStore({ connectionString: process.env.DATABASE_URL })
  : undefined;
