import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from "@clickvote/backend/src/packages/users/users.module";
import { Org, OrgSchema } from "@clickvote/backend/src/packages/org/org.document";
import { OrgInvite, OrgInviteSchema } from "@clickvote/backend/src/packages/org/org.invite.document";
import { OrgRepository } from "@clickvote/backend/src/packages/org/org.repository";
import { OrgService } from "@clickvote/backend/src/packages/org/org.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Org.name, schema: OrgSchema },
      { name: OrgInvite.name, schema: OrgInviteSchema }
    ]),
    UsersModule,
  ],
  controllers: [],
  providers: [OrgRepository, OrgService],
  exports: [OrgService],
})
export class OrgModule {}
