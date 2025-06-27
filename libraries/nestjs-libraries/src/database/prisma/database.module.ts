import { Global, Module } from '@nestjs/common';
import { PrismaRepository, PrismaService } from './prisma.service';
import { OrganizationRepository } from '@chaolaolo/nestjs-libraries/database/prisma/organizations/organization.repository';
import { OrganizationService } from '@chaolaolo/nestjs-libraries/database/prisma/organizations/organization.service';
import { UsersService } from '@chaolaolo/nestjs-libraries/database/prisma/users/users.service';
import { UsersRepository } from '@chaolaolo/nestjs-libraries/database/prisma/users/users.repository';
import { StarsService } from '@chaolaolo/nestjs-libraries/database/prisma/stars/stars.service';
import { StarsRepository } from '@chaolaolo/nestjs-libraries/database/prisma/stars/stars.repository';
import { SubscriptionService } from '@chaolaolo/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { SubscriptionRepository } from '@chaolaolo/nestjs-libraries/database/prisma/subscriptions/subscription.repository';
import { NotificationService } from '@chaolaolo/nestjs-libraries/database/prisma/notifications/notification.service';
import { IntegrationService } from '@chaolaolo/nestjs-libraries/database/prisma/integrations/integration.service';
import { IntegrationRepository } from '@chaolaolo/nestjs-libraries/database/prisma/integrations/integration.repository';
import { PostsService } from '@chaolaolo/nestjs-libraries/database/prisma/posts/posts.service';
import { PostsRepository } from '@chaolaolo/nestjs-libraries/database/prisma/posts/posts.repository';
import { IntegrationManager } from '@chaolaolo/nestjs-libraries/integrations/integration.manager';
import { MediaService } from '@chaolaolo/nestjs-libraries/database/prisma/media/media.service';
import { MediaRepository } from '@chaolaolo/nestjs-libraries/database/prisma/media/media.repository';
import { NotificationsRepository } from '@chaolaolo/nestjs-libraries/database/prisma/notifications/notifications.repository';
import { EmailService } from '@chaolaolo/nestjs-libraries/services/email.service';
import { ItemUserRepository } from '@chaolaolo/nestjs-libraries/database/prisma/marketplace/item.user.repository';
import { ItemUserService } from '@chaolaolo/nestjs-libraries/database/prisma/marketplace/item.user.service';
import { MessagesService } from '@chaolaolo/nestjs-libraries/database/prisma/marketplace/messages.service';
import { MessagesRepository } from '@chaolaolo/nestjs-libraries/database/prisma/marketplace/messages.repository';
import { StripeService } from '@chaolaolo/nestjs-libraries/services/stripe.service';
import { ExtractContentService } from '@chaolaolo/nestjs-libraries/openai/extract.content.service';
import { OpenaiService } from '@chaolaolo/nestjs-libraries/openai/openai.service';
import { AgenciesService } from '@chaolaolo/nestjs-libraries/database/prisma/agencies/agencies.service';
import { AgenciesRepository } from '@chaolaolo/nestjs-libraries/database/prisma/agencies/agencies.repository';
import { TrackService } from '@chaolaolo/nestjs-libraries/track/track.service';
import { ShortLinkService } from '@chaolaolo/nestjs-libraries/short-linking/short.link.service';
import { WebhooksRepository } from '@chaolaolo/nestjs-libraries/database/prisma/webhooks/webhooks.repository';
import { WebhooksService } from '@chaolaolo/nestjs-libraries/database/prisma/webhooks/webhooks.service';
import { SignatureRepository } from '@chaolaolo/nestjs-libraries/database/prisma/signatures/signature.repository';
import { SignatureService } from '@chaolaolo/nestjs-libraries/database/prisma/signatures/signature.service';
import { AutopostRepository } from '@chaolaolo/nestjs-libraries/database/prisma/autopost/autopost.repository';
import { AutopostService } from '@chaolaolo/nestjs-libraries/database/prisma/autopost/autopost.service';
import { SetsService } from '@chaolaolo/nestjs-libraries/database/prisma/sets/sets.service';
import { SetsRepository } from '@chaolaolo/nestjs-libraries/database/prisma/sets/sets.repository';
import { ThirdPartyRepository } from '@chaolaolo/nestjs-libraries/database/prisma/third-party/third-party.repository';
import { ThirdPartyService } from '@chaolaolo/nestjs-libraries/database/prisma/third-party/third-party.service';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [
    PrismaService,
    PrismaRepository,
    UsersService,
    UsersRepository,
    OrganizationService,
    OrganizationRepository,
    StarsService,
    StarsRepository,
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
    MessagesRepository,
    SignatureRepository,
    AutopostRepository,
    AutopostService,
    SignatureService,
    MediaService,
    MediaRepository,
    ItemUserRepository,
    AgenciesService,
    AgenciesRepository,
    ItemUserService,
    MessagesService,
    IntegrationManager,
    ExtractContentService,
    OpenaiService,
    EmailService,
    TrackService,
    ShortLinkService,
    SetsService,
    SetsRepository,
    ThirdPartyRepository,
    ThirdPartyService,
  ],
  get exports() {
    return this.providers;
  },
})
export class DatabaseModule { }
