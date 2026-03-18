import { __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { ThirdPartyRepository } from "./third-party.repository";
let ThirdPartyService = class ThirdPartyService {
    constructor(_thirdPartyRepository) {
        this._thirdPartyRepository = _thirdPartyRepository;
    }
    getAllThirdPartiesByOrganization(org) {
        return this._thirdPartyRepository.getAllThirdPartiesByOrganization(org);
    }
    deleteIntegration(org, id) {
        return this._thirdPartyRepository.deleteIntegration(org, id);
    }
    getIntegrationById(org, id) {
        return this._thirdPartyRepository.getIntegrationById(org, id);
    }
    saveIntegration(org, identifier, apiKey, data) {
        return this._thirdPartyRepository.saveIntegration(org, identifier, apiKey, data);
    }
};
ThirdPartyService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ThirdPartyRepository])
], ThirdPartyService);
export { ThirdPartyService };
//# sourceMappingURL=third-party.service.js.map