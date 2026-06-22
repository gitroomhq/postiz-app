import { PostgresStore } from '@mastra/pg';

export const pStore = new PostgresStore({
  id: 'postiz-store',
  connectionString: process.env.DATABASE_URL!,
  // Mastra gerencia as proprias tabelas (mastra_*) em runtime. Isolamos no
  // schema "mastra" para que o Prisma (que cuida do schema "public") nao tente
  // dropa-las ou versiona-las. Ver VOC-29 / baseline de migrations.
  schemaName: 'mastra',
});
