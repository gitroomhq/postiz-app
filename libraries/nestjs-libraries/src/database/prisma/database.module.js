import { __decorate } from "tslib";
import { Global, Module } from '@nestjs/common';
import { PrismaRepository, PrismaService, PrismaTransaction } from './prisma.service';
import { OrganizationRepository } from "./organizations/organization.repository";
import { OrganizationService } from "./organizations/organization.service";
import { UsersService } from "./users/users.service";
import { UsersRepository } from "./users/users.repository";
import { SubscriptionService } from "./subscriptions/subscription.service";
import { SubscriptionRepository } from "./subscriptions/subscription.repository";
import { NotificationService } from "./notifications/notification.service";
import { IntegrationService } from "./integrations/integration.service";
import { IntegrationRepository } from "./integrations/integration.repository";
import { PostsService } from "./posts/posts.service";
import { PostsRepository } from "./posts/posts.repository";
import { IntegrationManager } from "../../integrations/integration.manager";
import { MediaService } from "./media/media.service";
import { MediaRepository } from "./media/media.repository";
import { NotificationsRepository } from "./notifications/notifications.repository";
import { EmailService } from "../../services/email.service";
import { StripeService } from "../../services/stripe.service";
import { ExtractContentService } from "../../openai/extract.content.service";
import { OpenaiService } from "../../openai/openai.service";
import { AgenciesService } from "./agencies/agencies.service";
import { AgenciesRepository } from "./agencies/agencies.repository";
import { TrackService } from "../../track/track.service";
import { ShortLinkService } from "../../short-linking/short.link.service";
import { WebhooksRepository } from "./webhooks/webhooks.repository";
import { WebhooksService } from "./webhooks/webhooks.service";
import { SignatureRepository } from "./signatures/signature.repository";
import { SignatureService } from "./signatures/signature.service";
import { AutopostRepository } from "./autopost/autopost.repository";
import { AutopostService } from "./autopost/autopost.service";
import { SetsService } from "./sets/sets.service";
import { SetsRepository } from "./sets/sets.repository";
import { ThirdPartyRepository } from "./third-party/third-party.repository";
import { ThirdPartyService } from "./third-party/third-party.service";
import { VideoManager } from "../../videos/video.manager";
import { FalService } from "../../openai/fal.service";
import { RefreshIntegrationService } from "../../integrations/refresh.integration.service";
import { OAuthRepository } from "./oauth/oauth.repository";
import { OAuthService } from "./oauth/oauth.service";
let DatabaseModule = class DatabaseModule {
};
DatabaseModule = __decorate([
    Global(),
    Module({
        imports: [],
        controllers: [],
        providers: [
            PrismaService,
            PrismaRepository,
            PrismaTransaction,
            UsersService,
            UsersRepository,
            OrganizationService,
            OrganizationRepository,
            SubscriptionService,
            SubscriptionRepository,
            NotificationService,
            NotificationsRepository,
            WebhooksRepository,
            WebhooksService,
            IntegrationService,
            IntegrationRepository,
            PostsService,
            PostsRepository,
            StripeService,
            SignatureRepository,
            AutopostRepository,
            AutopostService,
            SignatureService,
            MediaService,
            MediaRepository,
            AgenciesService,
            AgenciesRepository,
            IntegrationManager,
            RefreshIntegrationService,
            ExtractContentService,
            OpenaiService,
            FalService,
            EmailService,
            TrackService,
            ShortLinkService,
            SetsService,
            SetsRepository,
            ThirdPartyRepository,
            ThirdPartyService,
            OAuthRepository,
            OAuthService,
            VideoManager,
        ],
        get exports() {
            return this.providers;
        },
    })
], DatabaseModule);
export { DatabaseModule };
//# sourceMappingURL=database.module.js.map