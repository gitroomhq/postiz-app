import { Module } from '@nestjs/common';

import {
  BullmqRegister,
  EncryptionService,
  MongooseModule,
  NestLibrariesModule,
} from '@clickvote/nest-libraries';
import { EventsGateway } from './events.gateway';
import { EnvService } from '../env/env.service';

@Module({
  imports: [NestLibrariesModule, MongooseModule, BullmqRegister],
  controllers: [],
  providers: [EventsGateway, EncryptionService, EnvService],
})
export class AppModule {}
