import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { TemporalHealthIndicator } from './temporal.health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [TemporalHealthIndicator],
})
export class HealthModule {}
