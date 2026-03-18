import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Body, Controller, Get, HttpException, Param, Post, Delete, } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ThirdPartyManager } from "../../../../../libraries/nestjs-libraries/src/3rdparties/thirdparty.manager";
import { GetOrgFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/org.from.request";
import { AuthService } from "../../../../../libraries/helpers/src/auth/auth.service";
import { UploadFactory } from "../../../../../libraries/nestjs-libraries/src/upload/upload.factory";
import { MediaService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/media/media.service";
let ThirdPartyController = class ThirdPartyController {
    constructor(_thirdPartyManager, _mediaService) {
        this._thirdPartyManager = _thirdPartyManager;
        this._mediaService = _mediaService;
        this.storage = UploadFactory.createStorage();
    }
    getThirdPartyList() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._thirdPartyManager.getAllThirdParties();
        });
    }
    getSavedThirdParty(organization) {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.all((yield this._thirdPartyManager.getAllThirdPartiesByOrganization(organization.id)).map((thirdParty) => {
                const { description, fields, position, title, identifier } = this._thirdPartyManager.getThirdPartyByName(thirdParty.identifier);
                return Object.assign(Object.assign({}, thirdParty), { title,
                    position,
                    fields,
                    description });
            }));
        });
    }
    deleteById(organization, id) {
        return this._thirdPartyManager.deleteIntegration(organization.id, id);
    }
    generate(organization, id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const thirdParty = yield this._thirdPartyManager.getIntegrationById(organization.id, id);
            if (!thirdParty) {
                throw new HttpException('Integration not found', 404);
            }
            const thirdPartyInstance = this._thirdPartyManager.getThirdPartyByName(thirdParty.identifier);
            if (!thirdPartyInstance) {
                throw new HttpException('Invalid identifier', 400);
            }
            const loadedData = yield ((_a = thirdPartyInstance === null || thirdPartyInstance === void 0 ? void 0 : thirdPartyInstance.instance) === null || _a === void 0 ? void 0 : _a.sendData(AuthService.fixedDecryption(thirdParty.apiKey), data));
            const file = yield this.storage.uploadSimple(loadedData);
            return this._mediaService.saveFile(organization.id, file.split('/').pop(), file);
        });
    }
    callFunction(organization, id, functionName, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const thirdParty = yield this._thirdPartyManager.getIntegrationById(organization.id, id);
            if (!thirdParty) {
                throw new HttpException('Integration not found', 404);
            }
            const thirdPartyInstance = this._thirdPartyManager.getThirdPartyByName(thirdParty.identifier);
            if (!thirdPartyInstance) {
                throw new HttpException('Invalid identifier', 400);
            }
            return (_a = thirdPartyInstance === null || thirdPartyInstance === void 0 ? void 0 : thirdPartyInstance.instance) === null || _a === void 0 ? void 0 : _a[functionName](AuthService.fixedDecryption(thirdParty.apiKey), data);
        });
    }
    addApiKey(organization, identifier, api) {
        return __awaiter(this, void 0, void 0, function* () {
            const thirdParty = this._thirdPartyManager.getThirdPartyByName(identifier);
            if (!thirdParty) {
                throw new HttpException('Invalid identifier', 400);
            }
            const connect = yield thirdParty.instance.checkConnection(api);
            if (!connect) {
                throw new HttpException('Invalid API key', 400);
            }
            try {
                const save = yield this._thirdPartyManager.saveIntegration(organization.id, identifier, api, {
                    name: connect.name,
                    username: connect.username,
                    id: connect.id,
                });
                return {
                    id: save.id,
                };
            }
            catch (e) {
                console.log(e);
                throw new HttpException('Integration Already Exists', 400);
            }
        });
    }
};
__decorate([
    Get('/list'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ThirdPartyController.prototype, "getThirdPartyList", null);
__decorate([
    Get('/'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ThirdPartyController.prototype, "getSavedThirdParty", null);
__decorate([
    Delete('/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ThirdPartyController.prototype, "deleteById", null);
__decorate([
    Post('/:id/submit'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ThirdPartyController.prototype, "generate", null);
__decorate([
    Post('/function/:id/:functionName'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Param('functionName')),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], ThirdPartyController.prototype, "callFunction", null);
__decorate([
    Post('/:identifier'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('identifier')),
    __param(2, Body('api')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ThirdPartyController.prototype, "addApiKey", null);
ThirdPartyController = __decorate([
    ApiTags('Third Party'),
    Controller('/third-party'),
    __metadata("design:paramtypes", [ThirdPartyManager,
        MediaService])
], ThirdPartyController);
export { ThirdPartyController };
//# sourceMappingURL=third-party.controller.js.map