import { Global, Module } from '@nestjs/common';
import { PrismaRepository, PrismaService, PrismaTransaction } from './prisma.service';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { UsersRepository } from '@gitroom/nestjs-libraries/database/prisma/users/users.repository';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { SubscriptionRepository } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.repository';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { IntegrationRepository } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.repository';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { PostsRepository } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.repository';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { MediaRepository } from '@gitroom/nestjs-libraries/database/prisma/media/media.repository';
import { NotificationsRepository } from '@gitroom/nestjs-libraries/database/prisma/notifications/notifications.repository';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { ExtractContentService } from '@gitroom/nestjs-libraries/openai/extract.content.service';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { AgenciesService } from '@gitroom/nestjs-libraries/database/prisma/agencies/agencies.service';
import { AgenciesRepository } from '@gitroom/nestjs-libraries/database/prisma/agencies/agencies.repository';
import { TrackService } from '@gitroom/nestjs-libraries/track/track.service';
import { ShortLinkService } from '@gitroom/nestjs-libraries/short-linking/short.link.service';
import { WebhooksRepository } from '@gitroom/nestjs-libraries/database/prisma/webhooks/webhooks.repository';
import { WebhooksService } from '@gitroom/nestjs-libraries/database/prisma/webhooks/webhooks.service';
import { SignatureRepository } from '@gitroom/nestjs-libraries/database/prisma/signatures/signature.repository';
import { SignatureService } from '@gitroom/nestjs-libraries/database/prisma/signatures/signature.service';
import { AutopostRepository } from '@gitroom/nestjs-libraries/database/prisma/autopost/autopost.repository';
import { AutopostService } from '@gitroom/nestjs-libraries/database/prisma/autopost/autopost.service';
import { SetsService } from '@gitroom/nestjs-libraries/database/prisma/sets/sets.service';
import { SetsRepository } from '@gitroom/nestjs-libraries/database/prisma/sets/sets.repository';
import { ThirdPartyRepository } from '@gitroom/nestjs-libraries/database/prisma/third-party/third-party.repository';
import { ThirdPartyService } from '@gitroom/nestjs-libraries/database/prisma/third-party/third-party.service';
import { VideoManager } from '@gitroom/nestjs-libraries/videos/video.manager';
import { FalService } from '@gitroom/nestjs-libraries/openai/fal.service';
import { RefreshIntegrationService } from '@gitroom/nestjs-libraries/integrations/refresh.integration.service';
import { CredentialRepository } from '@gitroom/nestjs-libraries/database/prisma/credentials/credential.repository';
import { CredentialService } from '@gitroom/nestjs-libraries/database/prisma/credentials/credential.service';
import { EncryptionService } from '@gitroom/nestjs-libraries/crypto/encryption.service';
import { ProfileRepository } from '@gitroom/nestjs-libraries/database/prisma/profiles/profile.repository';
import { ProfileService } from '@gitroom/nestjs-libraries/database/prisma/profiles/profile.service';
import { StartupMigrationService } from '@gitroom/nestjs-libraries/database/prisma/startup-migration.service';
import { VectorInitService } from '@gitroom/nestjs-libraries/chat/vector/vector.init.service';
import { KnowledgeRepository } from '@gitroom/nestjs-libraries/database/prisma/knowledge/knowledge.repository';
import { KnowledgeService } from '@gitroom/nestjs-libraries/database/prisma/knowledge/knowledge.service';
import { OAuthRepository } from '@gitroom/nestjs-libraries/database/prisma/oauth/oauth.repository';
import { OAuthService } from '@gitroom/nestjs-libraries/database/prisma/oauth/oauth.service';
import { AnnouncementsRepository } from '@gitroom/nestjs-libraries/database/prisma/announcements/announcements.repository';
import { AnnouncementsService } from '@gitroom/nestjs-libraries/database/prisma/announcements/announcements.service';
import { FlowsRepository } from '@gitroom/nestjs-libraries/database/prisma/flows/flows.repository';
import { FlowsService } from '@gitroom/nestjs-libraries/database/prisma/flows/flows.service';
import { ReviewLinksRepository } from '@gitroom/nestjs-libraries/database/prisma/review-links/review-links.repository';
import { ReviewLinksService } from '@gitroom/nestjs-libraries/database/prisma/review-links/review-links.service';
import { InstagramMessagingService } from '@gitroom/nestjs-libraries/integrations/social/instagram-messaging.service';
import { RepostRepository } from '@gitroom/nestjs-libraries/database/prisma/repost/repost.repository';
import { RepostService } from '@gitroom/nestjs-libraries/database/prisma/repost/repost.service';
import { AiModule } from '@gitroom/nestjs-libraries/ai/ai.module';

@Global()
@Module({
  imports: [AiModule],
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
    CredentialRepository,
    CredentialService,
    EncryptionService,
    ProfileRepository,
    ProfileService,
    StartupMigrationService,
    VectorInitService,
    KnowledgeRepository,
    KnowledgeService,
    AnnouncementsRepository,
    AnnouncementsService,
    FlowsRepository,
    FlowsService,
    ReviewLinksRepository,
    ReviewLinksService,
    InstagramMessagingService,
    RepostRepository,
    RepostService,
  ],
  get exports() {
    return this.providers;
  },
})
export class DatabaseModule {}
