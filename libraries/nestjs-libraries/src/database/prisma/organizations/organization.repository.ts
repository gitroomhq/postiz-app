import {PrismaRepository} from "@gitroom/nestjs-libraries/database/prisma/prisma.service";
import {Role} from '@prisma/client';
import {Injectable} from "@nestjs/common";
import {AuthService} from "@gitroom/helpers/auth/auth.service";
import {CreateOrgUserDto} from "@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto";

@Injectable()
export class OrganizationRepository {
    constructor(
        private _organization: PrismaRepository<'organization'>
    ) {
    }

    async createOrgAndUser(body: Omit<CreateOrgUserDto, 'providerToken'> & {providerId?: string}) {
        return this._organization.model.organization.create({
            data: {
                name: body.company,
                users: {
                    create: {
                        role: Role.USER,
                        user: {
                            create: {
                                email: body.email,
                                password: body.password ? AuthService.hashPassword(body.password) : '',
                                providerName: body.provider,
                                providerId: body.providerId || '',
                                timezone: 0
                            }
                        }
                    }
                }
            },
            select: {
                users: {
                    select: {
                        user: true
                    }
                }
            }
        });
    }
}