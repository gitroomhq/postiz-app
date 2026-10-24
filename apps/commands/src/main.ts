import { initializeSentry } from '@gitroom/nestjs-libraries/sentry/initialize.sentry';
initializeSentry('commands');
import * as Sentry from '@sentry/nestjs';
import { NestFactory } from '@nestjs/core';
import { CommandModule } from './command.module';
import { CommandService } from 'nestjs-command';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(CommandModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    await app.select(CommandModule).get(CommandService).exec();
    await app.close();
  } catch (error) {
    Sentry.captureException(error);
    console.error(error);
    await Sentry.flush(2000);
    await app.close();
    process.exit(1);
  }
}

bootstrap();
