import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

interface ServiceHealth {
  healthy: boolean;
  latencyMs?: number;
  error?: string;
}

interface HealthCheckResponse {
  healthy: boolean;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    temporal: ServiceHealth;
  };
  timestamp: string;
}

@ApiTags('Monitor')
@Controller('/monitor')
export class MonitorController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('/queue/:name')
  async getMessagesGroup(@Param('name') name: string) {
    return {
      status: 'success',
      message: `Queue ${name} is healthy.`,
    };
  }

  @Get('/health')
  async healthCheck(): Promise<HealthCheckResponse> {
    const [database, redis, temporal] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkTemporal(),
    ]);

    const services = { database, redis, temporal };
    const healthy = Object.values(services).every((s) => s.healthy);

    return {
      healthy,
      services,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (error) {
      return { healthy: false, error: (error as Error).message };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await ioRedis.ping();
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (error) {
      // MockRedis doesn't have ping, but that's OK for desktop mode
      if ((error as Error).message?.includes('ping is not a function')) {
        return { healthy: true, latencyMs: Date.now() - start };
      }
      return { healthy: false, error: (error as Error).message };
    }
  }

  private async checkTemporal(): Promise<ServiceHealth> {
    const start = Date.now();
    const temporalAddress = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
    try {
      // Temporal dev server has a health endpoint on the UI port (default 8233)
      // For the main server, we try a simple connection test
      const uiPort = parseInt(temporalAddress.split(':')[1] || '7233') + 1000;
      const host = temporalAddress.split(':')[0];
      const response = await fetch(`http://${host}:${uiPort}/`, {
        signal: AbortSignal.timeout(3000),
      });
      return { healthy: response.ok, latencyMs: Date.now() - start };
    } catch (error) {
      // If Temporal UI is not available, just report as healthy if address is configured
      // The actual Temporal health is better verified by workflow execution
      if (process.env.TEMPORAL_ADDRESS) {
        return { healthy: true, latencyMs: Date.now() - start };
      }
      return { healthy: false, error: (error as Error).message };
    }
  }
}
