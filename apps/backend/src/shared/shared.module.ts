import { Global, Module } from '@nestjs/common';
import { AuthService } from '@clickvote/backend/src/shared/auth/auth.service';
import { UsersModule } from '@clickvote/backend/src/packages/users/users.module';
import { RegistrationLoginService } from '@clickvote/backend/src/shared/auth/registration.login.service';
import { OrgModule } from '@clickvote/backend/src/packages/org/org.module';
import { EnvironmentModule } from '@clickvote/backend/src/packages/environment/environment.module';
import { MongooseModule, RedisService, PosthogService } from '@clickvote/nest-libraries';

@Global()
@Module({
  imports: [MongooseModule, UsersModule, OrgModule, EnvironmentModule],
  controllers: [],
  providers: [AuthService, RedisService, RegistrationLoginService, PosthogService],
  get exports() {
    return this.providers;
  },
})
export class SharedModule {}
