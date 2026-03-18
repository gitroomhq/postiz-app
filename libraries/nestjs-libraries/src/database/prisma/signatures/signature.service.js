import { __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { SignatureRepository } from "./signature.repository";
let SignatureService = class SignatureService {
    constructor(_signatureRepository) {
        this._signatureRepository = _signatureRepository;
    }
    getSignaturesByOrgId(orgId) {
        return this._signatureRepository.getSignaturesByOrgId(orgId);
    }
    getDefaultSignature(orgId) {
        return this._signatureRepository.getDefaultSignature(orgId);
    }
    createOrUpdateSignature(orgId, signature, id) {
        return this._signatureRepository.createOrUpdateSignature(orgId, signature, id);
    }
    deleteSignature(orgId, id) {
        return this._signatureRepository.deleteSignature(orgId, id);
    }
};
SignatureService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [SignatureRepository])
], SignatureService);
export { SignatureService };
//# sourceMappingURL=signature.service.js.map