import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthController } from '@gitroom/backend/api/routes/auth.controller';
import { AuthService } from '@gitroom/backend/services/auth/auth.service';
import { UsersController } from '@gitroom/backend/api/routes/users.controller';
import { AuthMiddleware } from '@gitroom/backend/services/auth/auth.middleware';
import { StripeController } from '@gitroom/backend/api/routes/stripe.controller';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { AnalyticsController } from '@gitroom/backend/api/routes/analytics.controller';
import { PoliciesGuard } from '@gitroom/backend/services/auth/permissions/permissions.guard';
import { PermissionsService } from '@gitroom/backend/services/auth/permissions/permissions.service';
import { IntegrationsController } from '@gitroom/backend/api/routes/integrations.controller';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { SettingsController } from '@gitroom/backend/api/routes/settings.controller';
import { BullMqModule } from '@gitroom/nestjs-libraries/bull-mq-transport/bull-mq.module';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { PostsController } from '@gitroom/backend/api/routes/posts.controller';
import { MediaController } from '@gitroom/backend/api/routes/media.controller';
import { UploadModule } from '@gitroom/nestjs-libraries/upload/upload.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { CommentsController } from '@gitroom/backend/api/routes/comments.controller';
import { BillingController } from '@gitroom/backend/api/routes/billing.controller';
import { NotificationsController } from '@gitroom/backend/api/routes/notifications.controller';
import { MarketplaceController } from '@gitroom/backend/api/routes/marketplace.controller';
import { MessagesController } from '@gitroom/backend/api/routes/messages.controller';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { ExtractContentService } from '@gitroom/nestjs-libraries/openai/extract.content.service';
import { CodesService } from '@gitroom/nestjs-libraries/services/codes.service';

const authenticatedController = [
  UsersController,
  AnalyticsController,
  IntegrationsController,
  SettingsController,
  PostsController,
  MediaController,
  CommentsController,
  BillingController,
  NotificationsController,
  MarketplaceController,
  MessagesController
];
@Module({
  imports: [
    UploadModule,
    BullMqModule.forRoot({
      connection: ioRedis,
    }),
    ...(!!process.env.UPLOAD_DIRECTORY &&
    !!process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY
      ? [
          ServeStaticModule.forRoot({
            rootPath: process.env.UPLOAD_DIRECTORY,
            serveRoot: '/' + process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY,
            serveStaticOptions: {
              index: false,
            },
          }),
        ]
      : []),
  ],
  controllers: [StripeController, AuthController, ...authenticatedController],
  providers: [
    AuthService,
    StripeService,
    OpenaiService,
    ExtractContentService,
    AuthMiddleware,
    PoliciesGuard,
    PermissionsService,
    CodesService,
    IntegrationManager,
  ],
  get exports() {
    return [...this.imports, ...this.providers];
  },
})
export class ApiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(...authenticatedController);
  }
}
