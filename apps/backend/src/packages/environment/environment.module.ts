import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnvironmentRepository } from '@clickvote/backend/src/packages/environment/environment.repository';
import { EnvironmentService } from '@clickvote/backend/src/packages/environment/environment.service';
import {Environment, EnvironmentSchema} from '@clickvote/backend/src/packages/environment/environment.document';
import {EncryptionService} from "@clickvote/nest-libraries";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Environment.name, schema: EnvironmentSchema }]),
  ],
  controllers: [],
  providers: [EnvironmentRepository, EnvironmentService, EncryptionService],
  exports: [EnvironmentService, EncryptionService],
})
export class EnvironmentModule {}
