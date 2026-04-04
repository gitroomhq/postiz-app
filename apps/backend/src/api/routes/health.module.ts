import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { TemporalHealthIndicator } from './temporal.health';
import { PrismaHealthIndicator } from './prisma.health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [TemporalHealthIndicator, PrismaHealthIndicator],
})
export class HealthModule {}
