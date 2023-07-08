import { Module } from '@nestjs/common';
import { AuthMiddleware } from '@clickvote/backend/src/middleware/auth.middleware';
import { UsersModule } from '@clickvote/backend/src/packages/users/users.module';
import { OrgModule } from '@clickvote/backend/src/packages/org/org.module';
import { EnvironmentModule } from '@clickvote/backend/src/packages/environment/environment.module';

@Module({
  imports: [UsersModule, OrgModule, EnvironmentModule],
  controllers: [],
  providers: [AuthMiddleware],
  get exports() {
    return this.providers;
  },
})
export class MiddlewareModule {}
