import {MiddlewareConsumer, Module, NestModule} from '@nestjs/common';
import {AuthController} from "@gitroom/backend/api/routes/auth.controller";
import {AuthService} from "@gitroom/backend/services/auth/auth.service";
import {UsersController} from "@gitroom/backend/api/routes/users.controller";
import {AuthMiddleware} from "@gitroom/backend/services/auth/auth.middleware";
import {StripeController} from "@gitroom/backend/api/routes/stripe.controller";
import {StripeService} from "@gitroom/nestjs-libraries/services/stripe.service";
import {AnalyticsController} from "@gitroom/backend/api/routes/analytics.controller";
import {PoliciesGuard} from "@gitroom/backend/services/auth/permissions/permissions.guard";
import {PermissionsService} from "@gitroom/backend/services/auth/permissions/permissions.service";
import {IntegrationsController} from "@gitroom/backend/api/routes/integrations.controller";
import {IntegrationManager} from "@gitroom/nestjs-libraries/integrations/integration.manager";
import {SettingsController} from "@gitroom/backend/api/routes/settings.controller";
import {BullMqModule} from "@gitroom/nestjs-libraries/bull-mq-transport/bull-mq.module";
import {ioRedis} from "@gitroom/nestjs-libraries/redis/redis.service";
import {PostsController} from "@gitroom/backend/api/routes/posts.controller";

const authenticatedController = [
    UsersController,
    AnalyticsController,
    IntegrationsController,
    SettingsController,
    PostsController
];
@Module({
    imports: [BullMqModule.forRoot({
        connection: ioRedis
    })],
    controllers: [StripeController, AuthController, ...authenticatedController],
    providers: [
        AuthService,
        StripeService,
        AuthMiddleware,
        PoliciesGuard,
        PermissionsService,
        IntegrationManager,
    ],
    get exports() {
        return [...this.imports, ...this.providers];
    }
})
export class ApiModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuthMiddleware)
            .forRoutes(...authenticatedController);
    }
}
