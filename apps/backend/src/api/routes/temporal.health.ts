import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthCheckError, HealthIndicatorService } from '@nestjs/terminus';
import { Connection } from '@temporalio/client';

@Injectable()
export class TemporalHealthIndicator {
  private connection: Connection | undefined;

  constructor(private healthIndicatorService: HealthIndicatorService) {}

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      if (!this.connection) {
        const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
        this.connection = await Connection.connect({
          address,
          ...(process.env.TEMPORAL_TLS === 'true' ? { tls: true } : {}),
          ...(process.env.TEMPORAL_API_KEY ? { apiKey: process.env.TEMPORAL_API_KEY } : {}),
        });
      }

      await Promise.race([
        this.connection.workflowService.getSystemInfo({}),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);

      return indicator.up();
    } catch (e: any) {
      throw new HealthCheckError(
        'Temporal check failed',
        indicator.down({ message: e.message })
      );
    }
  }
}
