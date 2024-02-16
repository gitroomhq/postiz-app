import {PrismaRepository} from "@gitroom/nestjs-libraries/database/prisma/prisma.service";
import {Injectable} from "@nestjs/common";

@Injectable()
export class IntegrationRepository {
    constructor(
        private _integration: PrismaRepository<'integration'>
    ) {
    }

    createIntegration(org: string, name: string, picture: string, type: 'article' | 'social' , internalId: string, provider: string, token: string, refreshToken = '', expiresIn = 999999999) {
        return this._integration.model.integration.create({
            data: {
                type: type as any,
                name,
                providerIdentifier: provider,
                token,
                picture,
                refreshToken,
                ...expiresIn ? {tokenExpiration: new Date(Date.now() + expiresIn * 1000)} :{},
                internalId,
                organizationId: org,
            }
        })
    }

    getIntegrationsList(org: string) {
        return this._integration.model.integration.findMany({
            where: {
                organizationId: org
            }
        });
    }
}