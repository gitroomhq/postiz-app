import { __awaiter, __decorate, __metadata } from "tslib";
import { PrismaRepository } from "../prisma.service";
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
let SignatureRepository = class SignatureRepository {
    constructor(_signatures) {
        this._signatures = _signatures;
    }
    getSignaturesByOrgId(orgId) {
        return this._signatures.model.signatures.findMany({
            where: { organizationId: orgId, deletedAt: null },
        });
    }
    getDefaultSignature(orgId) {
        return this._signatures.model.signatures.findFirst({
            where: { organizationId: orgId, autoAdd: true, deletedAt: null },
        });
    }
    createOrUpdateSignature(orgId, signature, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const values = {
                organizationId: orgId,
                content: signature.content,
                autoAdd: signature.autoAdd,
            };
            const { id: updatedId } = yield this._signatures.model.signatures.upsert({
                where: { id: id || uuidv4(), organizationId: orgId },
                update: values,
                create: values,
            });
            if (values.autoAdd) {
                yield this._signatures.model.signatures.updateMany({
                    where: { organizationId: orgId, id: { not: updatedId } },
                    data: { autoAdd: false },
                });
            }
            return { id: updatedId };
        });
    }
    deleteSignature(orgId, id) {
        return this._signatures.model.signatures.update({
            where: { id, organizationId: orgId },
            data: { deletedAt: new Date() },
        });
    }
};
SignatureRepository = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaRepository])
], SignatureRepository);
export { SignatureRepository };
//# sourceMappingURL=signature.repository.js.map