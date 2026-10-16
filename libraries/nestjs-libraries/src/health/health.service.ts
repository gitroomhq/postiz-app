import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

const CHECK_TIMEOUT = 5000;

export type HealthCheck = 'up' | 'down';

export interface Health {
  status: 'ok' | 'error';
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
  };
}

@Injectable()
export class HealthService {
  constructor(private _prismaService: PrismaService) {}

  // a dependency that never answers (a dead connection pool, a redis that is
  // unreachable behind a firewall) would otherwise hang the probe forever
  private async isUp(check: () => Promise<unknown>): Promise<boolean> {
    let timeout: NodeJS.Timeout | undefined;
    const timedOut = new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error('timed out')), CHECK_TIMEOUT);
    });

    try {
      await Promise.race([check(), timedOut]);
      return true;
    } catch (err) {
      // the check itself is the answer, the reason is not needed here
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  async check(): Promise<Health> {
    const [database, redis] = await Promise.all([
      // a real round trip through prisma, not a raw query
      this.isUp(() =>
        this._prismaService.user.findFirst({ select: { id: true } })
      ),
      this.isUp(() => ioRedis.ping()),
    ]);

    return {
      status: database && redis ? 'ok' : 'error',
      checks: {
        database: database ? 'up' : 'down',
        redis: redis ? 'up' : 'down',
      },
    };
  }
}
