import { __decorate } from "tslib";
import { Module } from '@nestjs/common';
import { AuthController } from "./routes/auth.controller";
import { AuthService } from "../services/auth/auth.service";
import { UsersController } from "./routes/users.controller";
import { AuthMiddleware } from "../services/auth/auth.middleware";
import { StripeController } from "./routes/stripe.controller";
import { StripeService } from "../../../../libraries/nestjs-libraries/src/services/stripe.service";
import { AnalyticsController } from "./routes/analytics.controller";
import { PoliciesGuard } from "../services/auth/permissions/permissions.guard";
import { PermissionsService } from "../services/auth/permissions/permissions.service";
import { IntegrationsController } from "./routes/integrations.controller";
import { IntegrationManager } from "../../../../libraries/nestjs-libraries/src/integrations/integration.manager";
import { SettingsController } from "./routes/settings.controller";
import { PostsController } from "./routes/posts.controller";
import { MediaController } from "./routes/media.controller";
import { UploadModule } from "../../../../libraries/nestjs-libraries/src/upload/upload.module";
import { BillingController } from "./routes/billing.controller";
import { NotificationsController } from "./routes/notifications.controller";
import { OpenaiService } from "../../../../libraries/nestjs-libraries/src/openai/openai.service";
import { ExtractContentService } from "../../../../libraries/nestjs-libraries/src/openai/extract.content.service";
import { CodesService } from "../../../../libraries/nestjs-libraries/src/services/codes.service";
import { CopilotController } from "./routes/copilot.controller";
import { PublicController } from "./routes/public.controller";
import { RootController } from "./routes/root.controller";
import { TrackService } from "../../../../libraries/nestjs-libraries/src/track/track.service";
import { ShortLinkService } from "../../../../libraries/nestjs-libraries/src/short-linking/short.link.service";
import { Nowpayments } from "../../../../libraries/nestjs-libraries/src/crypto/nowpayments";
import { WebhookController } from "./routes/webhooks.controller";
import { SignatureController } from "./routes/signature.controller";
import { AutopostController } from "./routes/autopost.controller";
import { SetsController } from "./routes/sets.controller";
import { ThirdPartyController } from "./routes/third-party.controller";
import { MonitorController } from "./routes/monitor.controller";
import { NoAuthIntegrationsController } from "./routes/no.auth.integrations.controller";
import { EnterpriseController } from "./routes/enterprise.controller";
import { OAuthAppController } from "./routes/oauth-app.controller";
import { ApprovedAppsController } from "./routes/approved-apps.controller";
import { OAuthController, OAuthAuthorizedController } from "./routes/oauth.controller";
import { AuthProviderManager } from "../services/auth/providers/providers.manager";
import { GithubProvider } from "../services/auth/providers/github.provider";
import { GoogleProvider } from "../services/auth/providers/google.provider";
import { FarcasterProvider } from "../services/auth/providers/farcaster.provider";
import { WalletProvider } from "../services/auth/providers/wallet.provider";
import { OauthProvider } from "../services/auth/providers/oauth.provider";
const authenticatedController = [
    UsersController,
    AnalyticsController,
    IntegrationsController,
    SettingsController,
    PostsController,
    MediaController,
    BillingController,
    NotificationsController,
    CopilotController,
    WebhookController,
    SignatureController,
    AutopostController,
    SetsController,
    ThirdPartyController,
    OAuthAppController,
    ApprovedAppsController,
    OAuthAuthorizedController,
];
let ApiModule = class ApiModule {
    configure(consumer) {
        consumer.apply(AuthMiddleware).forRoutes(...authenticatedController);
    }
};
ApiModule = __decorate([
    Module({
        imports: [UploadModule],
        controllers: [
            RootController,
            StripeController,
            AuthController,
            PublicController,
            MonitorController,
            EnterpriseController,
            NoAuthIntegrationsController,
            OAuthController,
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
            AuthProviderManager,
            GithubProvider,
            GoogleProvider,
            FarcasterProvider,
            WalletProvider,
            OauthProvider,
        ],
        get exports() {
            return [...this.imports, ...this.providers];
        },
    })
], ApiModule);
export { ApiModule };
//# sourceMappingURL=api.module.js.map