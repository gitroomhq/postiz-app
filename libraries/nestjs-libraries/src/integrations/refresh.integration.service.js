import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { IntegrationManager } from "./integration.manager";
import { IntegrationService } from "../database/prisma/integrations/integration.service";
import { TemporalService } from 'nestjs-temporal-core';
let RefreshIntegrationService = class RefreshIntegrationService {
    constructor(_integrationManager, _integrationService, _temporalService) {
        this._integrationManager = _integrationManager;
        this._integrationService = _integrationService;
        this._temporalService = _temporalService;
    }
    refresh(integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const socialProvider = this._integrationManager.getSocialIntegration(integration.providerIdentifier);
            const refresh = yield this.refreshProcess(integration, socialProvider);
            if (!refresh) {
                return false;
            }
            yield this._integrationService.createOrUpdateIntegration(undefined, !!socialProvider.oneTimeToken, integration.organizationId, integration.name, integration.picture, 'social', integration.internalId, integration.providerIdentifier, refresh.accessToken, refresh.refreshToken, refresh.expiresIn);
            return refresh;
        });
    }
    setBetweenSteps(integration) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._integrationService.setBetweenRefreshSteps(integration.id);
            yield this._integrationService.informAboutRefreshError(integration.organizationId, integration);
        });
    }
    startRefreshWorkflow(orgId, id, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!integration.refreshCron) {
                return false;
            }
            return (_a = this._temporalService.client
                .getRawClient()) === null || _a === void 0 ? void 0 : _a.workflow.start(`refreshTokenWorkflow`, {
                workflowId: `refresh_${id}`,
                args: [{ integrationId: id, organizationId: orgId }],
                taskQueue: 'main',
                workflowIdConflictPolicy: 'TERMINATE_EXISTING',
            });
        });
    }
    refreshProcess(integration, socialProvider) {
        return __awaiter(this, void 0, void 0, function* () {
            const refresh = yield socialProvider
                .refreshToken(integration.refreshToken)
                .catch((err) => false);
            if (!refresh || !refresh.accessToken) {
                yield this._integrationService.refreshNeeded(integration.organizationId, integration.id);
                yield this._integrationService.informAboutRefreshError(integration.organizationId, integration);
                yield this._integrationService.disconnectChannel(integration.organizationId, integration);
                return false;
            }
            if (!socialProvider.reConnect ||
                integration.rootInternalId === integration.internalId) {
                return refresh;
            }
            const reConnect = yield socialProvider.reConnect(integration.rootInternalId, integration.internalId, refresh.accessToken);
            return Object.assign(Object.assign({}, refresh), reConnect);
        });
    }
};
RefreshIntegrationService = __decorate([
    Injectable(),
    __param(1, Inject(forwardRef(() => IntegrationService))),
    __metadata("design:paramtypes", [IntegrationManager,
        IntegrationService,
        TemporalService])
], RefreshIntegrationService);
export { RefreshIntegrationService };
//# sourceMappingURL=refresh.integration.service.js.map