import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod, TemporalService, } from 'nestjs-temporal-core';
import { PostsService } from "../../../../libraries/nestjs-libraries/src/database/prisma/posts/posts.service";
import { NotificationService, } from "../../../../libraries/nestjs-libraries/src/database/prisma/notifications/notification.service";
import { State } from '@prisma/client';
import { stripHtmlValidation } from "../../../../libraries/helpers/src/utils/strip.html.validation";
import { IntegrationManager } from "../../../../libraries/nestjs-libraries/src/integrations/integration.manager";
import { RefreshIntegrationService } from "../../../../libraries/nestjs-libraries/src/integrations/refresh.integration.service";
import { timer } from "../../../../libraries/helpers/src/utils/timer";
import { IntegrationService } from "../../../../libraries/nestjs-libraries/src/database/prisma/integrations/integration.service";
import { WebhooksService } from "../../../../libraries/nestjs-libraries/src/database/prisma/webhooks/webhooks.service";
import { TypedSearchAttributes } from '@temporalio/common';
import { organizationId, postId as postIdSearchParam, } from "../../../../libraries/nestjs-libraries/src/temporal/temporal.search.attribute";
import { SubscriptionService } from "../../../../libraries/nestjs-libraries/src/database/prisma/subscriptions/subscription.service";
let PostActivity = class PostActivity {
    constructor(_postService, _notificationService, _integrationManager, _integrationService, _refreshIntegrationService, _webhookService, _temporalService, _subscriptionService) {
        this._postService = _postService;
        this._notificationService = _notificationService;
        this._integrationManager = _integrationManager;
        this._integrationService = _integrationService;
        this._refreshIntegrationService = _refreshIntegrationService;
        this._webhookService = _webhookService;
        this._temporalService = _temporalService;
        this._subscriptionService = _subscriptionService;
    }
    getIntegrationById(orgId, id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationService.getIntegrationById(orgId, id);
        });
    }
    searchForMissingThreeHoursPosts() {
        return __awaiter(this, void 0, void 0, function* () {
            const list = yield this._postService.searchForMissingThreeHoursPosts();
            for (const post of list) {
                yield this._temporalService.client
                    .getRawClient()
                    .workflow.signalWithStart('postWorkflowV101', {
                    workflowId: `post_${post.id}`,
                    taskQueue: 'main',
                    signal: 'poke',
                    workflowIdConflictPolicy: 'USE_EXISTING',
                    signalArgs: [],
                    args: [
                        {
                            taskQueue: post.integration.providerIdentifier
                                .split('-')[0]
                                .toLowerCase(),
                            postId: post.id,
                            organizationId: post.organizationId,
                        },
                    ],
                    typedSearchAttributes: new TypedSearchAttributes([
                        {
                            key: postIdSearchParam,
                            value: post.id,
                        },
                        {
                            key: organizationId,
                            value: post.organizationId,
                        },
                    ]),
                });
            }
        });
    }
    updatePost(id, postId, releaseURL) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postService.updatePost(id, postId, releaseURL);
        });
    }
    getPostsList(orgId, postId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (process.env.STRIPE_SECRET_KEY) {
                const subscription = yield this._subscriptionService.getSubscription(orgId);
                if (!subscription) {
                    return [];
                }
            }
            const getPosts = yield this._postService.getPostsRecursively(postId, true, orgId);
            if (!getPosts || getPosts.length === 0 || getPosts[0].parentPostId) {
                return [];
            }
            return getPosts;
        });
    }
    isCommentable(integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const getIntegration = this._integrationManager.getSocialIntegration(integration.providerIdentifier);
            return !!getIntegration.comment;
        });
    }
    postComment(postId, lastPostId, integration, posts) {
        return __awaiter(this, void 0, void 0, function* () {
            const getIntegration = this._integrationManager.getSocialIntegration(integration.providerIdentifier);
            const newPosts = yield this._postService.updateTags(integration.organizationId, posts);
            return getIntegration.comment(integration.internalId, postId, lastPostId, integration.token, yield Promise.all((newPosts || []).map((p) => __awaiter(this, void 0, void 0, function* () {
                return ({
                    id: p.id,
                    message: stripHtmlValidation(getIntegration.editor, p.content, true, false, !/<\/?[a-z][\s\S]*>/i.test(p.content), getIntegration.mentionFormat),
                    settings: JSON.parse(p.settings || '{}'),
                    media: yield this._postService.updateMedia(p.id, JSON.parse(p.image || '[]'), (getIntegration === null || getIntegration === void 0 ? void 0 : getIntegration.convertToJPEG) || false),
                });
            }))), integration);
        });
    }
    postSocial(integration, posts) {
        return __awaiter(this, void 0, void 0, function* () {
            const getIntegration = this._integrationManager.getSocialIntegration(integration.providerIdentifier);
            const newPosts = yield this._postService.updateTags(integration.organizationId, posts);
            const postNow = yield getIntegration.post(integration.internalId, integration.token, yield Promise.all((newPosts || []).map((p) => __awaiter(this, void 0, void 0, function* () {
                return ({
                    id: p.id,
                    message: stripHtmlValidation(getIntegration.editor, p.content, true, false, !/<\/?[a-z][\s\S]*>/i.test(p.content), getIntegration.mentionFormat),
                    settings: JSON.parse(p.settings || '{}'),
                    media: yield this._postService.updateMedia(p.id, JSON.parse(p.image || '[]'), (getIntegration === null || getIntegration === void 0 ? void 0 : getIntegration.convertToJPEG) || false),
                    publishDate: p.publishDate, // Pass scheduled publish date to provider
                });
            }))), integration);
            yield this._temporalService.client
                .getRawClient()
                .workflow.start('streakWorkflow', {
                args: [{ organizationId: integration.organizationId }],
                workflowId: `streak_${integration.organizationId}`,
                taskQueue: 'main',
                workflowIdConflictPolicy: 'TERMINATE_EXISTING',
                typedSearchAttributes: new TypedSearchAttributes([
                    {
                        key: organizationId,
                        value: integration.organizationId,
                    },
                ]),
            });
            return postNow;
        });
    }
    inAppNotification(orgId_1, subject_1, message_1) {
        return __awaiter(this, arguments, void 0, function* (orgId, subject, message, sendEmail = false, digest = false, type = 'success') {
            return this._notificationService.inAppNotification(orgId, subject, message, sendEmail, digest, type);
        });
    }
    globalPlugs(integration) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postService.checkPlugs(integration.organizationId, integration.providerIdentifier, integration.id);
        });
    }
    changeState(id, state, err, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postService.changeState(id, state, err, body);
        });
    }
    internalPlugs(integration, settings) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._postService.checkInternalPlug(integration, integration.organizationId, integration.id, settings);
        });
    }
    sendWebhooks(postId, orgId, integrationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const webhooks = (yield this._webhookService.getWebhooks(orgId)).filter((f) => {
                return (f.integrations.length === 0 ||
                    f.integrations.some((i) => i.integration.id === integrationId));
            });
            const post = yield this._postService.getPostByForWebhookId(postId);
            return Promise.all(webhooks.map((webhook) => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield fetch(webhook.url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(post),
                    });
                }
                catch (e) {
                    /**empty**/
                }
            })));
        });
    }
    processPlug(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationService.processPlugs(data);
        });
    }
    processInternalPlug(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationService.processInternalPlug(data);
        });
    }
    refreshToken(integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const getIntegration = this._integrationManager.getSocialIntegration(integration.providerIdentifier);
            try {
                const refresh = yield this._refreshIntegrationService.refresh(integration);
                if (!refresh) {
                    return false;
                }
                if (getIntegration.refreshWait) {
                    yield timer(10000);
                }
                return refresh;
            }
            catch (err) {
                yield this._refreshIntegrationService.setBetweenSteps(integration);
                return false;
            }
        });
    }
};
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PostActivity.prototype, "getIntegrationById", null);
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PostActivity.prototype, "searchForMissingThreeHoursPosts", null);
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PostActivity.prototype, "updatePost", null);
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PostActivity.prototype, "getPostsList", null);
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PostActivity.prototype, "isCommentable", null);
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Array]),
    __metadata("design:returntype", Promise)
], PostActivity.prototype, "postComment", null);
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array]),
    __metadata("design:returntype", Promise)
], PostActivity.prototype, "postSocial", null);
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object, String]),
    __metadata("design:returntype", Promise)
], PostActivity.prototype, "inAppNotification", null);
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PostActivity.prototype, "globalPlugs", null);
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], PostActivity.prototype, "changeState", null);
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PostActivity.prototype, "internalPlugs", null);
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PostActivity.prototype, "sendWebhooks", null);
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PostActivity.prototype, "processPlug", null);
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PostActivity.prototype, "processInternalPlug", null);
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PostActivity.prototype, "refreshToken", null);
PostActivity = __decorate([
    Injectable(),
    Activity(),
    __metadata("design:paramtypes", [PostsService,
        NotificationService,
        IntegrationManager,
        IntegrationService,
        RefreshIntegrationService,
        WebhooksService,
        TemporalService,
        SubscriptionService])
], PostActivity);
export { PostActivity };
//# sourceMappingURL=post.activity.js.map