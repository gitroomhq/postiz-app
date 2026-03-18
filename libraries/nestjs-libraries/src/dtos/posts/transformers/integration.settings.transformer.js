import { __awaiter, __decorate, __metadata } from "tslib";
import { Transform } from 'class-transformer';
import { IntegrationService } from "../../../database/prisma/integrations/integration.service";
import { Injectable } from '@nestjs/common';
let IntegrationSettingsTransformer = class IntegrationSettingsTransformer {
    constructor(integrationService) {
        this.integrationService = integrationService;
    }
    transformPost(post, orgId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!((_a = post.integration) === null || _a === void 0 ? void 0 : _a.id) || !post.settings) {
                return post;
            }
            try {
                // Get the integration from the database
                const integration = yield this.integrationService.getIntegrationById(orgId, post.integration.id);
                if (integration === null || integration === void 0 ? void 0 : integration.providerIdentifier) {
                    // Set the __type field based on the provider identifier
                    post.settings.__type = integration.providerIdentifier;
                }
            }
            catch (error) {
                // If there's an error fetching the integration, we'll let validation handle it
                console.error('Error fetching integration for settings transform:', error);
            }
            return post;
        });
    }
};
IntegrationSettingsTransformer = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [IntegrationService])
], IntegrationSettingsTransformer);
export { IntegrationSettingsTransformer };
// Custom property transformer for individual Post objects
export const TransformIntegrationSettings = (orgId) => {
    return Transform(({ value, obj }) => {
        // This will be handled by the service layer instead of transformer
        // since we need async database access
        return value;
    });
};
//# sourceMappingURL=integration.settings.transformer.js.map