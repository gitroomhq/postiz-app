// Initialize Sentry as early as possible
import { SentryNestJSService } from '@gitroom/helpers/sentry';
SentryNestJSService.init('cron');

import { NestFactory } from '@nestjs/core';
import { CronModule } from './cron.module';

async function bootstrap() {
  // some comment again
  await NestFactory.createApplicationContext(CronModule);
}

bootstrap();
