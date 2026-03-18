import { __awaiter, __decorate, __metadata } from "tslib";
import { createTool } from '@mastra/core/tools';
import { Injectable } from '@nestjs/common';
import { IntegrationService } from "../../database/prisma/integrations/integration.service";
import z from 'zod';
import { checkAuth } from "../auth.context";
import { getAuth } from "../async.storage";
let IntegrationListTool = class IntegrationListTool {
    constructor(_integrationService) {
        this._integrationService = _integrationService;
        this.name = 'integrationList';
    }
    run() {
        return createTool({
            id: 'integrationList',
            description: `This tool list available integrations to schedule posts to`,
            outputSchema: z.object({
                output: z.array(z.object({
                    id: z.string(),
                    name: z.string(),
                    picture: z.string(),
                    platform: z.string(),
                })),
            }),
            execute: (args, options) => __awaiter(this, void 0, void 0, function* () {
                console.log(getAuth());
                console.log(options);
                const { context, runtimeContext } = args;
                checkAuth(args, options);
                const organizationId = JSON.parse(
                // @ts-ignore
                runtimeContext.get('organization')).id;
                return {
                    output: (yield this._integrationService.getIntegrationsList(organizationId)).map((p) => ({
                        name: p.name,
                        id: p.id,
                        disabled: p.disabled,
                        picture: p.picture || '/no-picture.jpg',
                        platform: p.providerIdentifier,
                        display: p.profile,
                        type: p.type,
                    })),
                };
            }),
        });
    }
};
IntegrationListTool = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [IntegrationService])
], IntegrationListTool);
export { IntegrationListTool };
//# sourceMappingURL=integration.list.tool.js.map