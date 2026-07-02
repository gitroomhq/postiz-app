import { PostgresStore } from '@mastra/pg';

// Adormecido (docs/auditoria/plano-leveza-2026-07.md, Fase C1): Mastra fica em
// standby ate reativarmos pos-MVP. Singleton PREGUICOSO (so conecta no
// Postgres na primeira chamada real) para que o backend nao pague o custo de
// um pool de conexao extra so por o ChatModule estar registrado.
let _pStore: PostgresStore | undefined;
export function getPStore(): PostgresStore {
  if (!_pStore) {
    _pStore = new PostgresStore({
      id: 'postiz-store',
      connectionString: process.env.DATABASE_URL!,
      // Mastra gerencia as proprias tabelas (mastra_*) em runtime. Isolamos no
      // schema "mastra" para que o Prisma (que cuida do schema "public") nao tente
      // dropa-las ou versiona-las. Ver VOC-29 / baseline de migrations.
      schemaName: 'mastra',
    });
  }
  return _pStore;
}
