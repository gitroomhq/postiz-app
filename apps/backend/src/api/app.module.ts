import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthController } from '@clickvote/backend/src/api/auth/auth.controller';
import { UsersModule } from '@clickvote/backend/src/packages/users/users.module';
import { OrgModule } from '@clickvote/backend/src/packages/org/org.module';
import { UserController } from '@clickvote/backend/src/api/user/user.controller';
import { AuthMiddleware } from '@clickvote/backend/src/middleware/auth.middleware';
import { MiddlewareModule } from '@clickvote/backend/src/middleware/middleware.module';
import { VotesController } from '@clickvote/backend/src/api/votes/votes.controller';
import { VotesModule } from '@clickvote/backend/src/packages/votes/votes.module';
import { EnvironmentModule } from '@clickvote/backend/src/packages/environment/environment.module';
import { OrgController } from '@clickvote/backend/src/api/org/org.controller';
import { SettingsController } from '@clickvote/backend/src/api/settings/settings.controller';

const authenticatedControllers = [
  OrgController,
  SettingsController,
  UserController,
  VotesController,
];

@Module({
  imports: [
    UsersModule,
    OrgModule,
    VotesModule,
    EnvironmentModule,
    MiddlewareModule,
  ],
  controllers: [AuthController, ...authenticatedControllers],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(...authenticatedControllers);
  }
}
