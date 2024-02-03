import {Global, Module} from "@nestjs/common";
import {PrismaRepository, PrismaService} from "./prisma.service";
import {OrganizationRepository} from "@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository";
import {OrganizationService} from "@gitroom/nestjs-libraries/database/prisma/organizations/organization.service";
import {UsersService} from "@gitroom/nestjs-libraries/database/prisma/users/users.service";
import {UsersRepository} from "@gitroom/nestjs-libraries/database/prisma/users/users.repository";
import {StarsService} from "@gitroom/nestjs-libraries/database/prisma/stars/stars.service";
import {StarsRepository} from "@gitroom/nestjs-libraries/database/prisma/stars/stars.repository";

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
        StarsRepository
    ],
    get exports() {
        return this.providers;
    }
})
export class DatabaseModule {

}