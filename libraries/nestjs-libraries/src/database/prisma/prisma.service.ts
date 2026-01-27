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
  private pgliteInstance: { close: () => Promise<void> } | null = null;

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
        const { PGlite } = await import('@electric-sql/pglite');
        const { PrismaPGlite } = await import('pglite-prisma-adapter');

        this.pgliteInstance = new PGlite(pglitePath);
        const adapter = new PrismaPGlite(this.pgliteInstance);

        // Create new client with PGlite adapter and copy methods to this instance
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pgliteClient = new PrismaClient({ adapter } as any);
        Object.assign(this, pgliteClient);

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
