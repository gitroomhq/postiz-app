import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Body, Controller, Delete, Get, Param, Post, Put, } from '@nestjs/common';
import { GetOrgFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/org.from.request";
import { ApiTags } from '@nestjs/swagger';
import { SetsService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/sets/sets.service";
import { UpdateSetsDto, SetsDto, } from "../../../../../libraries/nestjs-libraries/src/dtos/sets/sets.dto";
let SetsController = class SetsController {
    constructor(_setsService) {
        this._setsService = _setsService;
    }
    getSets(org) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._setsService.getSets(org.id);
        });
    }
    createASet(org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._setsService.createSet(org.id, body);
        });
    }
    updateSet(org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._setsService.createSet(org.id, body);
        });
    }
    deleteSet(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._setsService.deleteSet(org.id, id);
        });
    }
};
__decorate([
    Get('/'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SetsController.prototype, "getSets", null);
__decorate([
    Post('/'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, SetsDto]),
    __metadata("design:returntype", Promise)
], SetsController.prototype, "createASet", null);
__decorate([
    Put('/'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpdateSetsDto]),
    __metadata("design:returntype", Promise)
], SetsController.prototype, "updateSet", null);
__decorate([
    Delete('/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SetsController.prototype, "deleteSet", null);
SetsController = __decorate([
    ApiTags('Sets'),
    Controller('/sets'),
    __metadata("design:paramtypes", [SetsService])
], SetsController);
export { SetsController };
//# sourceMappingURL=sets.controller.js.map