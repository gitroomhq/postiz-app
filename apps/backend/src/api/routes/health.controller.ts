import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  PrismaHealthIndicator,
  MicroserviceHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { TemporalHealthIndicator } from './temporal.health';
import { RedisOptions, Transport } from '@nestjs/microservices';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private microservice: MicroserviceHealthIndicator,
    private prismaService: PrismaService,
    private temporalHealth: TemporalHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prismaService),
      () =>
        this.microservice.pingCheck<RedisOptions>('redis', {
          transport: Transport.REDIS,
          options: {
            host: redisUrl.hostname,
            port: parseInt(redisUrl.port || '6379', 10),
          },
        }),
      () => this.temporalHealth.pingCheck('temporal'),
    ]);
  }
}
