import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import { IntegrationService } from "../../../../libraries/nestjs-libraries/src/database/prisma/integrations/integration.service";
import { RefreshIntegrationService } from "../../../../libraries/nestjs-libraries/src/integrations/refresh.integration.service";
let IntegrationsActivity = class IntegrationsActivity {
    constructor(_integrationService, _refreshIntegrationService) {
        this._integrationService = _integrationService;
        this._refreshIntegrationService = _refreshIntegrationService;
    }
    getIntegrationsById(id, orgId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationService.getIntegrationById(orgId, id);
        });
    }
    refreshToken(integration) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._refreshIntegrationService.refresh(integration);
        });
    }
};
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], IntegrationsActivity.prototype, "getIntegrationsById", null);
IntegrationsActivity = __decorate([
    Injectable(),
    Activity(),
    __metadata("design:paramtypes", [IntegrationService,
        RefreshIntegrationService])
], IntegrationsActivity);
export { IntegrationsActivity };
//# sourceMappingURL=integrations.activity.js.map