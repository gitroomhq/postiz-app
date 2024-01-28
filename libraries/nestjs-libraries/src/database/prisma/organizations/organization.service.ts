import {CreateOrgUserDto} from "@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto";
import {Injectable} from "@nestjs/common";
import {OrganizationRepository} from "@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository";

@Injectable()
export class OrganizationService {
    constructor(
        private _organizationRepository: OrganizationRepository
    ){}
    async createOrgAndUser(body: Omit<CreateOrgUserDto, 'providerToken'> & {providerId?: string}) {
        return this._organizationRepository.createOrgAndUser(body);
    }
}