import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthService } from '@chaolaolo/backend/services/auth/auth.service';
import { StripeService } from '@chaolaolo/nestjs-libraries/services/stripe.service';
import { PoliciesGuard } from '@chaolaolo/backend/services/auth/permissions/permissions.guard';
import { PermissionsService } from '@chaolaolo/backend/services/auth/permissions/permissions.service';
import { IntegrationManager } from '@chaolaolo/nestjs-libraries/integrations/integration.manager';
import { UploadModule } from '@chaolaolo/nestjs-libraries/upload/upload.module';
import { OpenaiService } from '@chaolaolo/nestjs-libraries/openai/openai.service';
import { ExtractContentService } from '@chaolaolo/nestjs-libraries/openai/extract.content.service';
import { CodesService } from '@chaolaolo/nestjs-libraries/services/codes.service';
import { PublicIntegrationsController } from '@chaolaolo/backend/public-api/routes/v1/public.integrations.controller';
import { PublicAuthMiddleware } from '@chaolaolo/backend/services/auth/public.auth.middleware';

const authenticatedController = [PublicIntegrationsController];
@Module({
  imports: [UploadModule],
  controllers: [...authenticatedController],
  providers: [
    AuthService,
    StripeService,
    OpenaiService,
    ExtractContentService,
    PoliciesGuard,
    PermissionsService,
    CodesService,
    IntegrationManager,
  ],
  get exports() {
    return [...this.imports, ...this.providers];
  },
})
export class PublicApiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PublicAuthMiddleware).forRoutes(...authenticatedController);
  }
}
