import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Logger, Controller, Get, Post, Req, Res, Query, Param, } from '@nestjs/common';
import { CopilotRuntime, OpenAIAdapter, copilotRuntimeNodeHttpEndpoint, copilotRuntimeNextJSAppRouterEndpoint, } from '@copilotkit/runtime';
import { GetOrgFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/org.from.request";
import { SubscriptionService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/subscriptions/subscription.service";
import { MastraAgent } from '@ag-ui/mastra';
import { MastraService } from "../../../../../libraries/nestjs-libraries/src/chat/mastra.service";
import { RuntimeContext } from '@mastra/core/di';
import { CheckPolicies } from "../../services/auth/permissions/permissions.ability";
import { AuthorizationActions, Sections } from "../../services/auth/permissions/permission.exception.class";
let CopilotController = class CopilotController {
    constructor(_subscriptionService, _mastraService) {
        this._subscriptionService = _subscriptionService;
        this._mastraService = _mastraService;
    }
    chatAgent(req, res) {
        if (process.env.OPENAI_API_KEY === undefined ||
            process.env.OPENAI_API_KEY === '') {
            Logger.warn('OpenAI API key not set, chat functionality will not work');
            return;
        }
        const copilotRuntimeHandler = copilotRuntimeNodeHttpEndpoint({
            endpoint: '/copilot/chat',
            runtime: new CopilotRuntime(),
            serviceAdapter: new OpenAIAdapter({
                model: 'gpt-4.1',
            }),
        });
        return copilotRuntimeHandler(req, res);
    }
    agent(req, res, organization) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            if (process.env.OPENAI_API_KEY === undefined ||
                process.env.OPENAI_API_KEY === '') {
                Logger.warn('OpenAI API key not set, chat functionality will not work');
                return;
            }
            const mastra = yield this._mastraService.mastra();
            const runtimeContext = new RuntimeContext();
            runtimeContext.set('integrations', ((_c = (_b = (_a = req === null || req === void 0 ? void 0 : req.body) === null || _a === void 0 ? void 0 : _a.variables) === null || _b === void 0 ? void 0 : _b.properties) === null || _c === void 0 ? void 0 : _c.integrations) || []);
            runtimeContext.set('organization', JSON.stringify(organization));
            runtimeContext.set('ui', 'true');
            const agents = MastraAgent.getLocalAgents({
                resourceId: organization.id,
                mastra,
                // @ts-ignore
                runtimeContext,
            });
            const runtime = new CopilotRuntime({
                agents,
            });
            const copilotRuntimeHandler = copilotRuntimeNextJSAppRouterEndpoint({
                endpoint: '/copilot/agent',
                runtime,
                // properties: req.body.variables.properties,
                serviceAdapter: new OpenAIAdapter({
                    model: 'gpt-4.1',
                }),
            });
            return copilotRuntimeHandler.handleRequest(req, res);
        });
    }
    calculateCredits(organization, type) {
        return this._subscriptionService.checkCredits(organization, type || 'ai_images');
    }
    getMessagesList(organization, threadId) {
        return __awaiter(this, void 0, void 0, function* () {
            const mastra = yield this._mastraService.mastra();
            const memory = yield mastra.getAgent('postiz').getMemory();
            try {
                return yield memory.query({
                    resourceId: organization.id,
                    threadId,
                });
            }
            catch (err) {
                return { messages: [] };
            }
        });
    }
    getList(organization) {
        return __awaiter(this, void 0, void 0, function* () {
            const mastra = yield this._mastraService.mastra();
            // @ts-ignore
            const memory = yield mastra.getAgent('postiz').getMemory();
            const list = yield memory.getThreadsByResourceIdPaginated({
                resourceId: organization.id,
                perPage: 100000,
                page: 0,
                orderBy: 'createdAt',
                sortDirection: 'DESC',
            });
            return {
                threads: list.threads.map((p) => ({
                    id: p.id,
                    title: p.title,
                })),
            };
        });
    }
};
__decorate([
    Post('/chat'),
    __param(0, Req()),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CopilotController.prototype, "chatAgent", null);
__decorate([
    Post('/agent'),
    CheckPolicies([AuthorizationActions.Create, Sections.AI]),
    __param(0, Req()),
    __param(1, Res()),
    __param(2, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], CopilotController.prototype, "agent", null);
__decorate([
    Get('/credits'),
    __param(0, GetOrgFromRequest()),
    __param(1, Query('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CopilotController.prototype, "calculateCredits", null);
__decorate([
    Get('/:thread/list'),
    CheckPolicies([AuthorizationActions.Create, Sections.AI]),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('thread')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CopilotController.prototype, "getMessagesList", null);
__decorate([
    Get('/list'),
    CheckPolicies([AuthorizationActions.Create, Sections.AI]),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CopilotController.prototype, "getList", null);
CopilotController = __decorate([
    Controller('/copilot'),
    __metadata("design:paramtypes", [SubscriptionService,
        MastraService])
], CopilotController);
export { CopilotController };
//# sourceMappingURL=copilot.controller.js.map