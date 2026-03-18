import { __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { SetsRepository } from "./sets.repository";
let SetsService = class SetsService {
    constructor(_setsRepository) {
        this._setsRepository = _setsRepository;
    }
    getTotal(orgId) {
        return this._setsRepository.getTotal(orgId);
    }
    getSets(orgId) {
        return this._setsRepository.getSets(orgId);
    }
    createSet(orgId, body) {
        return this._setsRepository.createSet(orgId, body);
    }
    deleteSet(orgId, id) {
        return this._setsRepository.deleteSet(orgId, id);
    }
};
SetsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [SetsRepository])
], SetsService);
export { SetsService };
//# sourceMappingURL=sets.service.js.map