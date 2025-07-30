// import { initializeSentry } from '@gitroom/nestjs-libraries/sentry/initialize.sentry';
// initializeSentry('cron');

import { NestFactory } from '@nestjs/core';
import { CronModule } from './cron.module';

async function bootstrap() {
  // some comment again
  await NestFactory.createApplicationContext(CronModule);
}

bootstrap();
