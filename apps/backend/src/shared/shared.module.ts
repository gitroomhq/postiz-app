import { Global, Module } from '@nestjs/common';
import { AuthService } from '@clickvote/backend/src/shared/auth/auth.service';
import { UsersModule } from '@clickvote/backend/src/packages/users/users.module';
import { RegistrationLoginService } from '@clickvote/backend/src/shared/auth/registration.login.service';
import { ResetPasswordService } from '@clickvote/backend/src/shared/auth/reset.service';
import { OrgModule } from '@clickvote/backend/src/packages/org/org.module';
import { EnvironmentModule } from '@clickvote/backend/src/packages/environment/environment.module';
import { PasswordResetTokensModule } from '../packages/reset/reset.module';
import { MongooseModule, RedisService } from '@clickvote/nest-libraries';
import { MailService } from '@clickvote/backend/src/shared/mail/mail.service';
import { MailModule } from '@clickvote/backend/src/shared/mail/mail.module';

@Global()
@Module({
  imports: [
    MongooseModule,
    UsersModule,
    OrgModule,
    EnvironmentModule,
    PasswordResetTokensModule,
    MailModule,
  ],
  controllers: [],
  providers: [AuthService, RedisService, RegistrationLoginService, ResetPasswordService, MailService],
  get exports() {
    return this.providers;
  },
})
export class SharedModule {}
