import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { GetOrgFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/org.from.request";
import { ApiTags } from '@nestjs/swagger';
import { SignatureService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/signatures/signature.service";
import { SignatureDto } from "../../../../../libraries/nestjs-libraries/src/dtos/signature/signature.dto";
let SignatureController = class SignatureController {
    constructor(_signatureService) {
        this._signatureService = _signatureService;
    }
    getSignatures(org) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._signatureService.getSignaturesByOrgId(org.id);
        });
    }
    getDefaultSignature(org) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._signatureService.getDefaultSignature(org.id)) || {};
        });
    }
    createSignature(org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._signatureService.createOrUpdateSignature(org.id, body);
        });
    }
    deleteSignature(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._signatureService.deleteSignature(org.id, id);
        });
    }
    updateSignature(id, org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._signatureService.createOrUpdateSignature(org.id, body, id);
        });
    }
};
__decorate([
    Get('/'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SignatureController.prototype, "getSignatures", null);
__decorate([
    Get('/default'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SignatureController.prototype, "getDefaultSignature", null);
__decorate([
    Post('/'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, SignatureDto]),
    __metadata("design:returntype", Promise)
], SignatureController.prototype, "createSignature", null);
__decorate([
    Delete('/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SignatureController.prototype, "deleteSignature", null);
__decorate([
    Put('/:id'),
    __param(0, Param('id')),
    __param(1, GetOrgFromRequest()),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, SignatureDto]),
    __metadata("design:returntype", Promise)
], SignatureController.prototype, "updateSignature", null);
SignatureController = __decorate([
    ApiTags('Signatures'),
    Controller('/signatures'),
    __metadata("design:paramtypes", [SignatureService])
], SignatureController);
export { SignatureController };
//# sourceMappingURL=signature.controller.js.map