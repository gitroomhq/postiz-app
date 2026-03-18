import { __awaiter, __decorate, __metadata } from "tslib";
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { IntegrationManager, socialIntegrationList, } from "../../integrations/integration.manager";
import { IntegrationService } from "../../database/prisma/integrations/integration.service";
import { RefreshToken } from "../../integrations/social.abstract";
import { timer } from "../../../../helpers/src/utils/timer";
import { checkAuth } from "../auth.context";
import { RefreshIntegrationService } from "../../integrations/refresh.integration.service";
let IntegrationTriggerTool = class IntegrationTriggerTool {
    constructor(_integrationManager, _integrationService, _refreshIntegrationService) {
        this._integrationManager = _integrationManager;
        this._integrationService = _integrationService;
        this._refreshIntegrationService = _refreshIntegrationService;
        this.name = 'triggerTool';
    }
    run() {
        return createTool({
            id: 'triggerTool',
            description: `After using the integrationSchema, we sometimes miss details we can\'t ask from the user, like ids.
      Sometimes this tool requires to user prompt for some settings, like a word to search for. methodName is required [input:callable-tools]`,
            inputSchema: z.object({
                integrationId: z.string().describe('The id of the integration'),
                methodName: z
                    .string()
                    .describe('The methodName from the `integrationSchema` functions in the tools array, required'),
                dataSchema: z.array(z.object({
                    key: z.string().describe('Name of the settings key to pass'),
                    value: z.string().describe('Value of the key'),
                })),
            }),
            outputSchema: z.object({
                output: z.array(z.record(z.string(), z.any())),
            }),
            execute: (args, options) => __awaiter(this, void 0, void 0, function* () {
                const { context, runtimeContext } = args;
                checkAuth(args, options);
                console.log('triggerTool', context);
                const organizationId = JSON.parse(
                // @ts-ignore
                runtimeContext.get('organization')).id;
                const getIntegration = yield this._integrationService.getIntegrationById(organizationId, context.integrationId);
                if (!getIntegration) {
                    return {
                        output: 'Integration not found',
                    };
                }
                const integrationProvider = socialIntegrationList.find((p) => p.identifier === getIntegration.providerIdentifier);
                if (!integrationProvider) {
                    return {
                        output: 'Integration not found',
                    };
                }
                const tools = this._integrationManager.getAllTools();
                if (
                // @ts-ignore
                !tools[integrationProvider.identifier].some((p) => p.methodName === context.methodName) ||
                    // @ts-ignore
                    !integrationProvider[context.methodName]) {
                    return { output: 'tool not found' };
                }
                while (true) {
                    try {
                        // @ts-ignore
                        const load = yield integrationProvider[context.methodName](getIntegration.token, context.dataSchema.reduce((all, current) => (Object.assign(Object.assign({}, all), { [current.key]: current.value })), {}), getIntegration.internalId, getIntegration);
                        return { output: load };
                    }
                    catch (err) {
                        if (err instanceof RefreshToken) {
                            const data = yield this._refreshIntegrationService.refresh(getIntegration);
                            if (!data) {
                                yield this._integrationService.disconnectChannel(organizationId, getIntegration);
                                return {
                                    output: 'We had to disconnect the channel as the token expired',
                                };
                            }
                            const { accessToken } = data;
                            if (accessToken) {
                                getIntegration.token = accessToken;
                                if (integrationProvider.refreshWait) {
                                    yield timer(10000);
                                }
                                continue;
                            }
                            else {
                            }
                        }
                        return { output: 'Unexpected error' };
                    }
                }
            }),
        });
    }
};
IntegrationTriggerTool = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [IntegrationManager,
        IntegrationService,
        RefreshIntegrationService])
], IntegrationTriggerTool);
export { IntegrationTriggerTool };
//# sourceMappingURL=integration.trigger.tool.js.map