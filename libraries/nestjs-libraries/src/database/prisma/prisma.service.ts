import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Extract PGlite data path from DATABASE_URL if specified.
 * Format: postgresql://...?pglite=/path/to/data
 * Returns null if not a PGlite URL.
 */
function extractPGlitePath(databaseUrl: string | undefined): string | null {
  if (!databaseUrl) return null;
  const match = databaseUrl.match(/[?&]pglite=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pgliteInstance: any = null;

  constructor() {
    super({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
      ],
    });
  }

  async onModuleInit() {
    const pglitePath = extractPGlitePath(process.env.DATABASE_URL);

    if (pglitePath) {
      // DATABASE_URL specifies PGlite - use embedded PostgreSQL
      try {
        // @ts-ignore - Optional dependency, only installed for desktop builds
        const { PGlite } = await import('@electric-sql/pglite');
        // @ts-ignore - Optional dependency, only installed for desktop builds
        const { PrismaPGlite } = await import('pglite-prisma-adapter');

        // Attempt to open the database. If a previous run was killed with SIGKILL
        // (e.g. force-quit or crash) PGlite WASM throws RuntimeError: Aborted()
        // because it cannot perform WAL crash recovery. Recovery: wipe the data
        // directory and start fresh with a clean database.
        let pgliteInstance: any;
        try {
          pgliteInstance = new PGlite(pglitePath);
          // Probe with a simple query to confirm the database is actually usable.
          // PGlite may not throw immediately on open but only on first query.
          await pgliteInstance.query('SELECT 1');
        } catch (openErr: any) {
          const isWasmAbort = String(openErr).includes('Aborted') || String(openErr).includes('RuntimeError');
          if (isWasmAbort) {
            console.warn(`[Prisma] PGlite database at ${pglitePath} is corrupt (${openErr}). Wiping and recreating.`);
            const { rmSync, mkdirSync } = await import('fs');
            try {
              rmSync(pglitePath, { recursive: true, force: true });
              mkdirSync(pglitePath, { recursive: true });
              console.log(`[Prisma] PGlite data directory wiped. Fresh database will be initialized.`);
            } catch (wipeErr) {
              throw new Error(`PGlite database is corrupt and could not be wiped: ${wipeErr}`);
            }
            pgliteInstance = new PGlite(pglitePath);
          } else {
            throw openErr;
          }
        }

        this.pgliteInstance = pgliteInstance;
        const adapter = new PrismaPGlite(this.pgliteInstance);

        // Create new client with PGlite adapter and copy methods to this instance
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pgliteClient = new PrismaClient({ adapter } as any);
        Object.assign(this, pgliteClient);

        // Initialize schema on fresh database before accepting connections.
        // prisma db push cannot connect to embedded PGlite (no TCP server),
        // so schema is pushed here via PGLITE_SCHEMA_SQL (generated at build time).
        await this.initializePGliteSchema(this.pgliteInstance);

        console.log(`[Prisma] Using embedded PGlite database at: ${pglitePath}`);
      } catch (err) {
        throw new Error(
          `DATABASE_URL specifies PGlite (pglite=${pglitePath}) but required packages are not installed. ` +
            `Install with: pnpm add @electric-sql/pglite pglite-prisma-adapter\n` +
            `Original error: ${err}`
        );
      }
    }

    await this.$connect();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async initializePGliteSchema(db: any): Promise<void> {
    // Check if schema already exists by probing the first Prisma model table
    try {
      await db.query(`SELECT 1 FROM "Organization" LIMIT 1`);
      console.log('[Prisma] PGlite schema already initialized');
      return;
    } catch {
      // Table does not exist - proceed with initialization
    }

    // Path to the pre-generated schema SQL, injected by the Tauri launcher via env var
    const sqlPath = process.env.PGLITE_SCHEMA_SQL;
    if (!sqlPath) {
      console.warn('[Prisma] PGLITE_SCHEMA_SQL not set - skipping schema initialization');
      return;
    }

    const { existsSync, readFileSync } = await import('fs');
    if (!existsSync(sqlPath)) {
      console.warn(`[Prisma] Schema SQL not found at ${sqlPath} - skipping initialization`);
      return;
    }

    console.log('[Prisma] Initializing PGlite database schema...');
    const sql = readFileSync(sqlPath, 'utf-8');
    await db.exec(sql);
    console.log('[Prisma] PGlite schema initialized successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (this.pgliteInstance) {
      await this.pgliteInstance.close();
    }
  }
}

@Injectable()
export class PrismaRepository<T extends keyof PrismaService> {
  public model: Pick<PrismaService, T>;
  constructor(private _prismaService: PrismaService) {
    this.model = this._prismaService;
  }
}

@Injectable()
export class PrismaTransaction {
  public model: Pick<PrismaService, '$transaction'>;
  constructor(private _prismaService: PrismaService) {
    this.model = this._prismaService;
  }
}
