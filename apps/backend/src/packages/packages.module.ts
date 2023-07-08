import { Module } from '@nestjs/common';

import { SharedModule } from '@clickvote/backend/src/shared/shared.module';
import { VotesModule } from '@clickvote/backend/src/packages/votes/votes.module';
import { UsersModule } from '@clickvote/backend/src/packages/users/users.module';
import { OrgModule } from '@clickvote/backend/src/packages/org/org.module';
import { EnvironmentModule } from '@clickvote/backend/src/packages/environment/environment.module';

@Module({
  imports: [
    SharedModule,
    VotesModule,
    UsersModule,
    OrgModule,
    EnvironmentModule,
  ],
  controllers: [],
  providers: [],
})
export class PackagesModule {}
