import { __decorate, __metadata } from "tslib";
import { PrismaRepository } from "../prisma.service";
import { Injectable } from '@nestjs/common';
import { AuthService } from "../../../../../helpers/src/auth/auth.service";
let ThirdPartyRepository = class ThirdPartyRepository {
    constructor(_thirdParty) {
        this._thirdParty = _thirdParty;
    }
    getAllThirdPartiesByOrganization(org) {
        return this._thirdParty.model.thirdParty.findMany({
            where: { organizationId: org, deletedAt: null },
            select: {
                id: true,
                name: true,
                identifier: true,
            },
        });
    }
    deleteIntegration(org, id) {
        return this._thirdParty.model.thirdParty.update({
            where: { id, organizationId: org },
            data: { deletedAt: new Date() },
        });
    }
    getIntegrationById(org, id) {
        return this._thirdParty.model.thirdParty.findFirst({
            where: { id, organizationId: org, deletedAt: null },
        });
    }
    saveIntegration(org, identifier, apiKey, data) {
        return this._thirdParty.model.thirdParty.upsert({
            where: {
                organizationId_internalId: {
                    internalId: data.id,
                    organizationId: org,
                },
            },
            create: {
                organizationId: org,
                name: data.name,
                internalId: data.id,
                identifier,
                apiKey: AuthService.fixedEncryption(apiKey),
                deletedAt: null,
            },
            update: {
                organizationId: org,
                name: data.name,
                internalId: data.id,
                identifier,
                apiKey: AuthService.fixedEncryption(apiKey),
                deletedAt: null,
            },
        });
    }
};
ThirdPartyRepository = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaRepository])
], ThirdPartyRepository);
export { ThirdPartyRepository };
//# sourceMappingURL=third-party.repository.js.map