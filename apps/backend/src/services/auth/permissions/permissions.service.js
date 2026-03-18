import { __awaiter, __decorate, __metadata, __rest } from "tslib";
import { Ability, AbilityBuilder } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { pricing } from "../../../../../../libraries/nestjs-libraries/src/database/prisma/subscriptions/pricing";
import { SubscriptionService } from "../../../../../../libraries/nestjs-libraries/src/database/prisma/subscriptions/subscription.service";
import { PostsService } from "../../../../../../libraries/nestjs-libraries/src/database/prisma/posts/posts.service";
import { IntegrationService } from "../../../../../../libraries/nestjs-libraries/src/database/prisma/integrations/integration.service";
import dayjs from 'dayjs';
import { WebhooksService } from "../../../../../../libraries/nestjs-libraries/src/database/prisma/webhooks/webhooks.service";
import { AuthorizationActions, Sections } from './permission.exception.class';
let PermissionsService = class PermissionsService {
    constructor(_subscriptionService, _postsService, _integrationService, _webhooksService) {
        this._subscriptionService = _subscriptionService;
        this._postsService = _postsService;
        this._integrationService = _integrationService;
        this._webhooksService = _webhooksService;
    }
    getPackageOptions(orgId) {
        return __awaiter(this, void 0, void 0, function* () {
            const subscription = yield this._subscriptionService.getSubscriptionByOrganizationId(orgId);
            const tier = (subscription === null || subscription === void 0 ? void 0 : subscription.subscriptionTier) ||
                (!process.env.STRIPE_PUBLISHABLE_KEY ? 'PRO' : 'FREE');
            const _a = pricing[tier], { channel } = _a, all = __rest(_a, ["channel"]);
            return {
                subscription,
                options: Object.assign(Object.assign({}, all), { channel: tier === 'FREE' ? channel : -10 }),
            };
        });
    }
    check(orgId, created_at, permission, requestedPermission) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { can, build } = new AbilityBuilder(Ability);
            if (requestedPermission.length === 0 ||
                !process.env.STRIPE_PUBLISHABLE_KEY) {
                for (const [action, section] of requestedPermission) {
                    can(action, section);
                }
                return build({
                    detectSubjectType: (item) => 
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    item.constructor,
                });
            }
            const { subscription, options } = yield this.getPackageOptions(orgId);
            for (const [action, section] of requestedPermission) {
                // check for the amount of channels
                if (section === Sections.CHANNEL) {
                    const totalChannels = (yield this._integrationService.getIntegrationsList(orgId)).filter((f) => !f.refreshNeeded).length;
                    if ((options.channel && options.channel > totalChannels) ||
                        ((subscription === null || subscription === void 0 ? void 0 : subscription.totalChannels) || 0) > totalChannels) {
                        can(action, section);
                        continue;
                    }
                }
                if (section === Sections.WEBHOOKS) {
                    const totalWebhooks = yield this._webhooksService.getTotal(orgId);
                    if (totalWebhooks < options.webhooks) {
                        can(AuthorizationActions.Create, section);
                        continue;
                    }
                }
                // check for posts per month
                if (section === Sections.POSTS_PER_MONTH) {
                    const createdAt = ((_a = (yield this._subscriptionService.getSubscription(orgId))) === null || _a === void 0 ? void 0 : _a.createdAt) ||
                        created_at;
                    const totalMonthPast = Math.abs(dayjs(createdAt).diff(dayjs(), 'month'));
                    const checkFrom = dayjs(createdAt).add(totalMonthPast, 'month');
                    const count = yield this._postsService.countPostsFromDay(orgId, checkFrom.toDate());
                    if (count < options.posts_per_month) {
                        can(action, section);
                        continue;
                    }
                }
                if (section === Sections.TEAM_MEMBERS && options.team_members) {
                    can(action, section);
                    continue;
                }
                if (section === Sections.ADMIN &&
                    ['ADMIN', 'SUPERADMIN'].includes(permission)) {
                    can(action, section);
                    continue;
                }
                if (section === Sections.COMMUNITY_FEATURES &&
                    options.community_features) {
                    can(action, section);
                    continue;
                }
                if (section === Sections.FEATURED_BY_GITROOM &&
                    options.featured_by_gitroom) {
                    can(action, section);
                    continue;
                }
                if (section === Sections.AI && options.ai) {
                    can(action, section);
                    continue;
                }
                if (section === Sections.IMPORT_FROM_CHANNELS &&
                    options.import_from_channels) {
                    can(action, section);
                }
            }
            return build({
                detectSubjectType: (item) => 
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                item.constructor,
            });
        });
    }
};
PermissionsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [SubscriptionService,
        PostsService,
        IntegrationService,
        WebhooksService])
], PermissionsService);
export { PermissionsService };
//# sourceMappingURL=permissions.service.js.map