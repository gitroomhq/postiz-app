import {Injectable} from "@nestjs/common";
import {IntegrationRepository} from "@gitroom/nestjs-libraries/database/prisma/integrations/integration.repository";

@Injectable()
export class IntegrationService {
    constructor(
        private _integrationRepository: IntegrationRepository,
    ) {
    }
    createIntegration(org: string, name: string, picture: string, type: 'article' | 'social' , internalId: string, provider: string, token: string, refreshToken = '', expiresIn?: number) {
        return this._integrationRepository.createIntegration(org, name, picture, type, internalId, provider, token, refreshToken, expiresIn);
    }

    getIntegrationsList(org: string) {
        return this._integrationRepository.getIntegrationsList(org);
    }

    getIntegrationById(org: string, id: string) {
        return this._integrationRepository.getIntegrationById(org, id);
    }
}
