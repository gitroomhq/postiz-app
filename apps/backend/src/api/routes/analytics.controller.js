import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Controller, Get, Param, Query } from '@nestjs/common';
import { GetOrgFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/org.from.request";
import { ApiTags } from '@nestjs/swagger';
import { IntegrationService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/integrations/integration.service";
import { PostsService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/posts/posts.service";
let AnalyticsController = class AnalyticsController {
    constructor(_integrationService, _postsService) {
        this._integrationService = _integrationService;
        this._postsService = _postsService;
    }
    getIntegration(org, integration, date) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationService.checkAnalytics(org, integration, date);
        });
    }
    getPostAnalytics(org, postId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postsService.checkPostAnalytics(org.id, postId, +date);
        });
    }
};
__decorate([
    Get('/:integration'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('integration')),
    __param(2, Query('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getIntegration", null);
__decorate([
    Get('/post/:postId'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('postId')),
    __param(2, Query('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getPostAnalytics", null);
AnalyticsController = __decorate([
    ApiTags('Analytics'),
    Controller('/analytics'),
    __metadata("design:paramtypes", [IntegrationService,
        PostsService])
], AnalyticsController);
export { AnalyticsController };
//# sourceMappingURL=analytics.controller.js.map