import { __awaiter } from "tslib";
import { proxyActivities, sleep } from '@temporalio/workflow';
const { getIntegrationsById, refreshToken } = proxyActivities({
    startToCloseTimeout: '10 minute',
    retry: {
        maximumAttempts: 3,
        backoffCoefficient: 1,
        initialInterval: '2 minutes',
    },
});
export function refreshTokenWorkflow(_a) {
    return __awaiter(this, arguments, void 0, function* ({ organizationId, integrationId, }) {
        while (true) {
            let integration = yield getIntegrationsById(integrationId, organizationId);
            if (!integration ||
                integration.deletedAt ||
                integration.inBetweenSteps ||
                integration.refreshNeeded) {
                return false;
            }
            const today = new Date();
            const endDate = new Date(integration.tokenExpiration);
            const minMax = Math.max(0, endDate.getTime() - today.getTime());
            if (!minMax) {
                return false;
            }
            yield sleep(minMax);
            // while we were sleeping, the integration might have been deleted
            integration = yield getIntegrationsById(integrationId, organizationId);
            if (!integration ||
                integration.deletedAt ||
                integration.inBetweenSteps ||
                integration.refreshNeeded) {
                return false;
            }
            yield refreshToken(integration);
        }
    });
}
//# sourceMappingURL=refresh.token.workflow.js.map