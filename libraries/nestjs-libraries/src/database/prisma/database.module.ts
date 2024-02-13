import {Global, Module} from "@nestjs/common";
import {PrismaRepository, PrismaService} from "./prisma.service";
import {OrganizationRepository} from "@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository";
import {OrganizationService} from "@gitroom/nestjs-libraries/database/prisma/organizations/organization.service";
import {UsersService} from "@gitroom/nestjs-libraries/database/prisma/users/users.service";
import {UsersRepository} from "@gitroom/nestjs-libraries/database/prisma/users/users.repository";
import {StarsService} from "@gitroom/nestjs-libraries/database/prisma/stars/stars.service";
import {StarsRepository} from "@gitroom/nestjs-libraries/database/prisma/stars/stars.repository";
import {SubscriptionService} from "@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service";
import {SubscriptionRepository} from "@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.repository";
import {NotificationService} from "@gitroom/nestjs-libraries/notifications/notification.service";
import {IntegrationService} from "@gitroom/nestjs-libraries/database/prisma/integrations/integration.service";
import {IntegrationRepository} from "@gitroom/nestjs-libraries/database/prisma/integrations/integration.repository";

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
        IntegrationService,
        IntegrationRepository
    ],
    get exports() {
        return this.providers;
    }
})
export class DatabaseModule {

}