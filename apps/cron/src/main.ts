import { NestFactory } from '@nestjs/core';
import { CronModule } from './cron.module';
import { initializeSentry } from '@gitroom/nestjs-libraries/sentry/initialize.sentry';

initializeSentry();

async function bootstrap() {
  // some comment again
  await NestFactory.createApplicationContext(CronModule);
}

bootstrap();
