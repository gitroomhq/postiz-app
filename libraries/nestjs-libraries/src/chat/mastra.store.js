import { PostgresStore } from '@mastra/pg';
export const pStore = new PostgresStore({
    connectionString: process.env.DATABASE_URL,
});
//# sourceMappingURL=mastra.store.js.map