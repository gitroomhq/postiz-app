import {PrismaRepository} from "@gitroom/nestjs-libraries/database/prisma/prisma.service";
import {Injectable} from "@nestjs/common";
import {Provider} from '@prisma/client';

@Injectable()
export class UsersRepository {
    constructor(
        private _user: PrismaRepository<'user'>
    ) {
    }

    getUserByEmail(email: string) {
        return this._user.model.user.findFirst({
            where: {
                email
            }
        });
    }

    getUserByProvider(providerId: string, provider: Provider) {
        return this._user.model.user.findFirst({
            where: {
                providerId,
                providerName: provider
            }
        });
    }
}