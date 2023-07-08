import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './websockets/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(
    `🚀 Websockets is running on: http://localhost:${port}`
  );
}

bootstrap();
