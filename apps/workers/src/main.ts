import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { MicroserviceOptions } from '@nestjs/microservices';
import { BullMqServer } from '@gitroom/nestjs-libraries/bull-mq-transport-new/strategy';
import { initializeSentry } from '@gitroom/nestjs-libraries/sentry/initialize.sentry';

initializeSentry();

async function bootstrap() {
  process.env.IS_WORKER = 'true';

  // some comment again
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      strategy: new BullMqServer(),
    }
  );

  await app.listen();
}

bootstrap();
