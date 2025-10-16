import { PostgresStore, PgVector } from '@mastra/pg';

export const pStore = new PostgresStore({
  connectionString: process.env.DATABASE_URL,
});
