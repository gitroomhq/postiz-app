import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthController } from '@chaolaolo/backend/api/routes/auth.controller';
import { AuthService } from '@chaolaolo/backend/services/auth/auth.service';
import { UsersController } from '@chaolaolo/backend/api/routes/users.controller';
import { AuthMiddleware } from '@chaolaolo/backend/services/auth/auth.middleware';
import { StripeController } from '@chaolaolo/backend/api/routes/stripe.controller';
import { StripeService } from '@chaolaolo/nestjs-libraries/services/stripe.service';
import { AnalyticsController } from '@chaolaolo/backend/api/routes/analytics.controller';
import { PoliciesGuard } from '@chaolaolo/backend/services/auth/permissions/permissions.guard';
import { PermissionsService } from '@chaolaolo/backend/services/auth/permissions/permissions.service';
import { IntegrationsController } from '@chaolaolo/backend/api/routes/integrations.controller';
import { IntegrationManager } from '@chaolaolo/nestjs-libraries/integrations/integration.manager';
import { SettingsController } from '@chaolaolo/backend/api/routes/settings.controller';
import { PostsController } from '@chaolaolo/backend/api/routes/posts.controller';
import { MediaController } from '@chaolaolo/backend/api/routes/media.controller';
import { UploadModule } from '@chaolaolo/nestjs-libraries/upload/upload.module';
import { BillingController } from '@chaolaolo/backend/api/routes/billing.controller';
import { NotificationsController } from '@chaolaolo/backend/api/routes/notifications.controller';
import { MarketplaceController } from '@chaolaolo/backend/api/routes/marketplace.controller';
import { MessagesController } from '@chaolaolo/backend/api/routes/messages.controller';
import { OpenaiService } from '@chaolaolo/nestjs-libraries/openai/openai.service';
import { ExtractContentService } from '@chaolaolo/nestjs-libraries/openai/extract.content.service';
import { CodesService } from '@chaolaolo/nestjs-libraries/services/codes.service';
import { CopilotController } from '@chaolaolo/backend/api/routes/copilot.controller';
import { AgenciesController } from '@chaolaolo/backend/api/routes/agencies.controller';
import { PublicController } from '@chaolaolo/backend/api/routes/public.controller';
import { RootController } from '@chaolaolo/backend/api/routes/root.controller';
import { TrackService } from '@chaolaolo/nestjs-libraries/track/track.service';
import { ShortLinkService } from '@chaolaolo/nestjs-libraries/short-linking/short.link.service';
import { Nowpayments } from '@chaolaolo/nestjs-libraries/crypto/nowpayments';
import { WebhookController } from '@chaolaolo/backend/api/routes/webhooks.controller';
import { SignatureController } from '@chaolaolo/backend/api/routes/signature.controller';
import { AutopostController } from '@chaolaolo/backend/api/routes/autopost.controller';
import { McpService } from '@chaolaolo/nestjs-libraries/mcp/mcp.service';
import { McpController } from '@chaolaolo/backend/api/routes/mcp.controller';
import { SetsController } from '@chaolaolo/backend/api/routes/sets.controller';
import { ThirdPartyController } from '@chaolaolo/backend/api/routes/third-party.controller';

const authenticatedController = [
  UsersController,
  AnalyticsController,
  IntegrationsController,
  SettingsController,
  PostsController,
  MediaController,
  BillingController,
  NotificationsController,
  MarketplaceController,
  MessagesController,
  CopilotController,
  AgenciesController,
  WebhookController,
  SignatureController,
  AutopostController,
  SetsController,
  ThirdPartyController,
];
@Module({
  imports: [UploadModule],
  controllers: [
    RootController,
    StripeController,
    AuthController,
    PublicController,
    McpController,
    ...authenticatedController,
  ],
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
    TrackService,
    ShortLinkService,
    Nowpayments,
    McpService,
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
