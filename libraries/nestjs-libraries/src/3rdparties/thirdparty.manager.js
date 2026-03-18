import { __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { ThirdPartyAbstract, } from "./thirdparty.interface";
import { ModuleRef } from '@nestjs/core';
import { ThirdPartyService } from "../database/prisma/third-party/third-party.service";
let ThirdPartyManager = class ThirdPartyManager {
    constructor(_moduleRef, _thirdPartyService) {
        this._moduleRef = _moduleRef;
        this._thirdPartyService = _thirdPartyService;
    }
    getAllThirdParties() {
        return (Reflect.getMetadata('third:party', ThirdPartyAbstract) || []).map((p) => ({
            identifier: p.identifier,
            title: p.title,
            description: p.description,
            fields: p.fields || [],
        }));
    }
    getThirdPartyByName(identifier) {
        const thirdParty = (Reflect.getMetadata('third:party', ThirdPartyAbstract) || []).find((p) => p.identifier === identifier);
        return Object.assign(Object.assign({}, thirdParty), { instance: this._moduleRef.get(thirdParty.target) });
    }
    deleteIntegration(org, id) {
        return this._thirdPartyService.deleteIntegration(org, id);
    }
    getIntegrationById(org, id) {
        return this._thirdPartyService.getIntegrationById(org, id);
    }
    getAllThirdPartiesByOrganization(org) {
        return this._thirdPartyService.getAllThirdPartiesByOrganization(org);
    }
    saveIntegration(org, identifier, apiKey, data) {
        return this._thirdPartyService.saveIntegration(org, identifier, apiKey, data);
    }
};
ThirdPartyManager = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ModuleRef,
        ThirdPartyService])
], ThirdPartyManager);
export { ThirdPartyManager };
//# sourceMappingURL=thirdparty.manager.js.map