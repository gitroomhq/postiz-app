import {CreateOrgUserDto} from "@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto";
import {Injectable} from "@nestjs/common";
import {OrganizationRepository} from "@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository";
import {NotificationService} from "@gitroom/nestjs-libraries/notifications/notification.service";

@Injectable()
export class OrganizationService {
    constructor(
        private _organizationRepository: OrganizationRepository,
        private _notificationsService: NotificationService
    ){}
    async createOrgAndUser(body: Omit<CreateOrgUserDto, 'providerToken'> & {providerId?: string}) {
        const register = await this._organizationRepository.createOrgAndUser(body);
        await this._notificationsService.identifyUser(register.users[0].user);
        await this._notificationsService.registerUserToTopic(register.users[0].user.id, `organization:${register.id}`);
        return register;
    }

    getOrgById(id: string) {
        return this._organizationRepository.getOrgById(id);
    }

    getFirstOrgByUserId(userId: string) {
        return this._organizationRepository.getFirstOrgByUserId(userId);
    }
}