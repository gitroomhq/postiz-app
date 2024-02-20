process.env.TZ='UTC';

import cookieParser from 'cookie-parser';
import {Logger, ValidationPipe} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {SubscriptionExceptionFilter} from "@gitroom/backend/services/auth/permissions/subscription.exception";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      credentials: true,
      exposedHeaders: ['reload'],
      origin: [process.env.FRONTEND_URL],
    }
  });

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
  }));

  app.use(cookieParser());
  app.useGlobalFilters(new SubscriptionExceptionFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}`
  );
}

bootstrap();
