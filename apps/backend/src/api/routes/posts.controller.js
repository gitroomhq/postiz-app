import { __asyncValues, __awaiter, __decorate, __metadata, __param } from "tslib";
import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, } from '@nestjs/common';
import { PostsService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/posts/posts.service";
import { GetOrgFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/org.from.request";
import { GetPostsDto } from "../../../../../libraries/nestjs-libraries/src/dtos/posts/get.posts.dto";
import { GetPostsListDto } from "../../../../../libraries/nestjs-libraries/src/dtos/posts/get.posts.list.dto";
import { CheckPolicies } from "../../services/auth/permissions/permissions.ability";
import { ApiTags } from '@nestjs/swagger';
import { GeneratorDto } from "../../../../../libraries/nestjs-libraries/src/dtos/generator/generator.dto";
import { CreateGeneratedPostsDto } from "../../../../../libraries/nestjs-libraries/src/dtos/generator/create.generated.posts.dto";
import { AgentGraphService } from "../../../../../libraries/nestjs-libraries/src/agent/agent.graph.service";
import { GetUserFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/user.from.request";
import { ShortLinkService } from "../../../../../libraries/nestjs-libraries/src/short-linking/short.link.service";
import { CreateTagDto } from "../../../../../libraries/nestjs-libraries/src/dtos/posts/create.tag.dto";
import { AuthorizationActions, Sections, } from "../../services/auth/permissions/permission.exception.class";
let PostsController = class PostsController {
    constructor(_postsService, _agentGraphService, _shortLinkService) {
        this._postsService = _postsService;
        this._agentGraphService = _agentGraphService;
        this._shortLinkService = _shortLinkService;
    }
    getStatistics(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postsService.getStatistics(org.id, id);
        });
    }
    getMissingContent(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postsService.getMissingContent(org.id, id);
        });
    }
    updateReleaseId(org, id, releaseId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postsService.updateReleaseId(org.id, id, releaseId);
        });
    }
    shouldShortlink(body) {
        return __awaiter(this, void 0, void 0, function* () {
            return { ask: this._shortLinkService.askShortLinkedin(body.messages) };
        });
    }
    createComment(org, user, id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postsService.createComment(org.id, user.id, id, body.comment);
        });
    }
    getTags(org) {
        return __awaiter(this, void 0, void 0, function* () {
            return { tags: yield this._postsService.getTags(org.id) };
        });
    }
    createTag(org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postsService.createTag(org.id, body);
        });
    }
    editTag(org, body, id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postsService.editTag(id, org.id, body);
        });
    }
    deleteTag(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postsService.deleteTag(id, org.id);
        });
    }
    getPosts(org, query) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postsService.getPostsMinified(org.id, query);
        });
    }
    findSlot(org) {
        return __awaiter(this, void 0, void 0, function* () {
            return { date: yield this._postsService.findFreeDateTime(org.id) };
        });
    }
    findSlotIntegration(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            return { date: yield this._postsService.findFreeDateTime(org.id, id) };
        });
    }
    getPostsList(org, query) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postsService.getPostsList(org.id, query);
        });
    }
    oldPosts(org, date) {
        return this._postsService.getOldPosts(org.id, date);
    }
    getPostsByGroup(org, group) {
        return this._postsService.getPostsByGroup(org.id, group);
    }
    getPost(org, id) {
        return this._postsService.getPost(org.id, id);
    }
    createPost(org, rawBody) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(JSON.stringify(rawBody, null, 2));
            const body = yield this._postsService.mapTypeToPost(rawBody, org.id);
            return this._postsService.createPost(org.id, body);
        });
    }
    generatePostsDraft(org, body) {
        return this._postsService.generatePostsDraft(org.id, body);
    }
    generatePosts(org, body, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, e_1, _b, _c;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            try {
                for (var _d = true, _e = __asyncValues(this._agentGraphService.start(org.id, body)), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const event = _c;
                    res.write(JSON.stringify(event) + '\n');
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
            res.end();
        });
    }
    deletePost(org, group) {
        return this._postsService.deletePost(org.id, group);
    }
    changeDate(org, id, date, action = 'schedule') {
        return this._postsService.changeDate(org.id, id, date, action);
    }
    separatePosts(org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postsService.separatePosts(body.content, body.len);
        });
    }
};
__decorate([
    Get('/:id/statistics'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getStatistics", null);
__decorate([
    Get('/:id/missing'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getMissingContent", null);
__decorate([
    Put('/:id/release-id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Body('releaseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "updateReleaseId", null);
__decorate([
    Post('/should-shortlink'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "shouldShortlink", null);
__decorate([
    Post('/:id/comments'),
    __param(0, GetOrgFromRequest()),
    __param(1, GetUserFromRequest()),
    __param(2, Param('id')),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "createComment", null);
__decorate([
    Get('/tags'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getTags", null);
__decorate([
    Post('/tags'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreateTagDto]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "createTag", null);
__decorate([
    Put('/tags/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __param(2, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreateTagDto, String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "editTag", null);
__decorate([
    Delete('/tags/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "deleteTag", null);
__decorate([
    Get('/'),
    __param(0, GetOrgFromRequest()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, GetPostsDto]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getPosts", null);
__decorate([
    Get('/find-slot'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "findSlot", null);
__decorate([
    Get('/find-slot/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "findSlotIntegration", null);
__decorate([
    Get('/list'),
    __param(0, GetOrgFromRequest()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, GetPostsListDto]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getPostsList", null);
__decorate([
    Get('/old'),
    __param(0, GetOrgFromRequest()),
    __param(1, Query('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "oldPosts", null);
__decorate([
    Get('/group/:group'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('group')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "getPostsByGroup", null);
__decorate([
    Get('/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "getPost", null);
__decorate([
    Post('/'),
    CheckPolicies([AuthorizationActions.Create, Sections.POSTS_PER_MONTH]),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "createPost", null);
__decorate([
    Post('/generator/draft'),
    CheckPolicies([AuthorizationActions.Create, Sections.POSTS_PER_MONTH]),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreateGeneratedPostsDto]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "generatePostsDraft", null);
__decorate([
    Post('/generator'),
    CheckPolicies([AuthorizationActions.Create, Sections.POSTS_PER_MONTH]),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __param(2, Res({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, GeneratorDto, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "generatePosts", null);
__decorate([
    Delete('/:group'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('group')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "deletePost", null);
__decorate([
    Put('/:id/date'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Body('date')),
    __param(3, Body('action')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "changeDate", null);
__decorate([
    Post('/separate-posts'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "separatePosts", null);
PostsController = __decorate([
    ApiTags('Posts'),
    Controller('/posts'),
    __metadata("design:paramtypes", [PostsService,
        AgentGraphService,
        ShortLinkService])
], PostsController);
export { PostsController };
//# sourceMappingURL=posts.controller.js.map