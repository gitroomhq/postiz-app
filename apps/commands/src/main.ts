import { NestFactory } from '@nestjs/core';
import { CommandModule } from './command.module';
import { CommandService } from 'nestjs-command';

async function bootstrap() {
  // some comment again
  const app = await NestFactory.createApplicationContext(CommandModule, {
    logger: ['error'],
  });

  try {
    await app.select(CommandModule).get(CommandService).exec();
    await app.close();
  } catch (error) {
    console.error(error);
    await app.close();
    process.exit(1);
  }
}

bootstrap();
