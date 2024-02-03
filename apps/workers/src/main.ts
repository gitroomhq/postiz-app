import {NestFactory} from '@nestjs/core';

import {AppModule} from './app/app.module';
import {MicroserviceOptions} from '@nestjs/microservices';
import {BullMqServer} from "@gitroom/nestjs-libraries/bull-mq-transport/server/bull-mq.server";

async function bootstrap() {
    const load = await NestFactory.create(AppModule);
    const strategy = load.get(BullMqServer);

    // some comment again
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
        strategy,
    });

    await app.listen();
}

bootstrap();