import { initializeSentry } from '@gitroom/nestjs-libraries/sentry/initialize.sentry';
initializeSentry('orchestrator', true);
import 'source-map-support/register';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

import { NestFactory } from '@nestjs/core';
import { AppModule } from '@gitroom/orchestrator/app.module';
import { startMemoryProbe } from '@gitroom/nestjs-libraries/telemetry/memory.probe';
import * as dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const port = process.env.ORCHESTRATOR_PORT || 3002;
  await app.listen(port);
  console.log(`Orchestrator health check listening on port ${port}`);

  // One probe per PROCESS (not per Temporal Worker — the ~33 Workers share this
  // process's heap and RSS). Railway names the service for us, so the tag is
  // right even if MEMORY_PROBE_SERVICE is never set.
  if (process.env.MEMORY_PROBE === 'true') {
    const interval = Number(process.env.MEMORY_PROBE_INTERVAL_MS);
    startMemoryProbe(
      process.env.MEMORY_PROBE_SERVICE ||
        process.env.RAILWAY_SERVICE_NAME ||
        'orchestrator',
      interval > 0 ? interval : undefined
    );
  }
}


bootstrap();
