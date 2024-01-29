import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { MicroserviceOptions } from '@nestjs/microservices';
import {BullMqTransport} from "@gitroom/nestjs-libraries/bullmq-transport/bullmq-transport";

async function bootstrap() {
  const strategy = new BullMqTransport();
  // some comment again
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      strategy,
    }
  );

  await app.listen();

  // Let's make sure everything runs first!
  await strategy.activate();
}

bootstrap();
