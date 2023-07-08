import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {Org, OrgSchema} from "@clickvote/backend/src/packages/org/org.document";
import {OrgRepository} from "@clickvote/backend/src/packages/org/org.repository";
import {OrgService} from "@clickvote/backend/src/packages/org/org.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Org.name, schema: OrgSchema }]),
  ],
  controllers: [],
  providers: [OrgRepository, OrgService],
  exports: [OrgService],
})
export class OrgModule {}
