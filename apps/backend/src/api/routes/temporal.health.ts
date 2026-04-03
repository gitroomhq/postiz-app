import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { Connection } from '@temporalio/client';

@Injectable()
export class TemporalHealthIndicator extends HealthIndicator {
  private connection: Connection | undefined;

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
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

      return this.getStatus(key, true);
    } catch (e: any) {
      throw new HealthCheckError(
        'Temporal check failed',
        this.getStatus(key, false, { message: e.message })
      );
    }
  }
}
