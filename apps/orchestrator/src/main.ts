import { initializeSentry } from '@gitroom/nestjs-libraries/sentry/initialize.sentry';
initializeSentry('orchestrator', true);
import 'source-map-support/register';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

import { NestFactory } from '@nestjs/core';
import { AppModule } from '@gitroom/orchestrator/app.module';
import * as dns from 'node:dns';
import { DefaultLogger, Runtime } from '@temporalio/worker';
import { format } from 'node:util';
dns.setDefaultResultOrder('ipv4first');

// The Temporal SDK writes its own logs (TS side straight to stderr, native
// core straight to the console), so Sentry's console integration never sees
// them - route both through console, in the SDK's own line format, so they
// are shipped along with app logs.
Runtime.install({
  logger: new DefaultLogger(
    'INFO',
    ({ level, timestampNanos, message, meta }) => {
      const date = new Date(Number(timestampNanos / BigInt(1000000)));
      const line =
        meta === undefined
          ? `${format(date)} [${level}] ${message}`
          : `${format(date)} [${level}] ${message} ${format(meta)}`;
      if (level === 'ERROR' || level === 'WARN') {
        console.error(line);
      } else {
        console.log(line);
      }
    }
  ),
  telemetryOptions: {
    logging: {
      filter: { core: 'WARN', other: 'ERROR' },
      forward: {},
    },
  },
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const port = process.env.ORCHESTRATOR_PORT || 3002;
  await app.listen(port);
  console.log(`Orchestrator health check listening on port ${port}`);
}


bootstrap();
