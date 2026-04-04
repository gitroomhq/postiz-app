import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private prisma: PrismaService) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (error: any) {
      throw new HealthCheckError(
        'Prisma check failed',
        this.getStatus(key, false, {
          message: error?.message ?? 'Prisma ping failed',
        })
      );
    }
  }
}
