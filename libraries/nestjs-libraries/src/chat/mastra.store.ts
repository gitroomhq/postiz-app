import { PostgresStore } from '@mastra/pg';

export const pStore = new PostgresStore({
  id: 'postiz-store',
  connectionString: process.env.DATABASE_URL!,
});
