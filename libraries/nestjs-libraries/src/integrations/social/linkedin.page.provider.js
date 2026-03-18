import { __awaiter, __decorate, __metadata, __rest } from "tslib";
import { makeId } from "../../services/make.is";
import { LinkedinProvider } from "./linkedin.provider";
import dayjs from 'dayjs';
import { Plug } from "../../../../helpers/src/decorators/plug.decorator";
import { timer } from "../../../../helpers/src/utils/timer";
import { Rules } from "../../chat/rules.description.decorator";
let LinkedinPageProvider = class LinkedinPageProvider extends LinkedinProvider {
    constructor() {
        super(...arguments);
        this.identifier = 'linkedin-page';
        this.name = 'LinkedIn Page';
        this.isBetweenSteps = true;
        this.refreshWait = true;
        this.maxConcurrentJob = 2; // LinkedIn Page has professional posting limits
        this.scopes = [
            'openid',
            'profile',
            'w_member_social',
            'r_basicprofile',
            'rw_organization_admin',
            'w_organization_social',
            'r_organization_social',
        ];
        this.editor = 'normal';
    }
    refreshToken(refresh_token) {
        return __awaiter(this, void 0, void 0, function* () {
            const { access_token: accessToken, expires_in, refresh_token: refreshToken, } = yield (yield fetch('https://www.linkedin.com/oauth/v2/accessToken', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token,
                    client_id: process.env.LINKEDIN_CLIENT_ID,
                    client_secret: process.env.LINKEDIN_CLIENT_SECRET,
                }),
            })).json();
            const { vanityName } = yield (yield fetch('https://api.linkedin.com/v2/me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })).json();
            const { name, sub: id, picture, } = yield (yield fetch('https://api.linkedin.com/v2/userinfo', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })).json();
            return {
                id,
                accessToken,
                refreshToken,
                expiresIn: expires_in,
                name,
                picture,
                username: vanityName,
            };
        });
    }
    addComment(integration, originalIntegration, postId, information) {
        const _super = Object.create(null, {
            addComment: { get: () => super.addComment }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return _super.addComment.call(this, integration, originalIntegration, postId, information, false);
        });
    }
    repostPostUsers(integration, originalIntegration, postId, information) {
        const _super = Object.create(null, {
            repostPostUsers: { get: () => super.repostPostUsers }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return _super.repostPostUsers.call(this, integration, originalIntegration, postId, information, false);
        });
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            const state = makeId(6);
            const codeVerifier = makeId(30);
            const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&prompt=none&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/linkedin-page`)}&state=${state}&scope=${encodeURIComponent(this.scopes.join(' '))}`;
            return {
                url,
                codeVerifier,
                state,
            };
        });
    }
    companies(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const _a = yield (yield fetch('https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organizationalTarget~(localizedName,vanityName,logoV2(original~:playableStreams))))', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0',
                    'LinkedIn-Version': '202601',
                },
            })).json(), { elements } = _a, all = __rest(_a, ["elements"]);
            return (elements || []).map((e) => {
                var _a, _b, _c, _d, _e, _f;
                return ({
                    id: e.organizationalTarget.split(':').pop(),
                    page: e.organizationalTarget.split(':').pop(),
                    username: e['organizationalTarget~'].vanityName,
                    name: e['organizationalTarget~'].localizedName,
                    picture: (_f = (_e = (_d = (_c = (_b = (_a = e['organizationalTarget~'].logoV2) === null || _a === void 0 ? void 0 : _a['original~']) === null || _b === void 0 ? void 0 : _b.elements) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.identifiers) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.identifier,
                });
            });
        });
    }
    reConnect(id, requiredId, accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const information = yield this.fetchPageInformation(accessToken, {
                page: requiredId,
            });
            return {
                id: information.id,
                name: information.name,
                accessToken: information.access_token,
                picture: information.picture,
                username: information.username,
            };
        });
    }
    fetchPageInformation(accessToken, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const pageId = params.page;
            const data = yield (yield fetch(`https://api.linkedin.com/v2/organizations/${pageId}?projection=(id,localizedName,vanityName,logoV2(original~:playableStreams))`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })).json();
            return {
                id: data.id,
                name: data.localizedName,
                access_token: accessToken,
                picture: (_e = (_d = (_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.logoV2) === null || _a === void 0 ? void 0 : _a['original~']) === null || _b === void 0 ? void 0 : _b.elements) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.identifiers) === null || _e === void 0 ? void 0 : _e[0].identifier,
                username: data.vanityName,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = new URLSearchParams();
            body.append('grant_type', 'authorization_code');
            body.append('code', params.code);
            body.append('redirect_uri', `${process.env.FRONTEND_URL}/integrations/social/linkedin-page`);
            body.append('client_id', process.env.LINKEDIN_CLIENT_ID);
            body.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET);
            const { access_token: accessToken, expires_in: expiresIn, refresh_token: refreshToken, scope, } = yield (yield fetch('https://www.linkedin.com/oauth/v2/accessToken', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body,
            })).json();
            this.checkScopes(this.scopes, scope);
            const { name, sub: id, picture, } = yield (yield fetch('https://api.linkedin.com/v2/userinfo', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })).json();
            const { vanityName } = yield (yield fetch('https://api.linkedin.com/v2/me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })).json();
            return {
                id: `p_${id}`,
                accessToken,
                refreshToken,
                expiresIn,
                name,
                picture,
                username: vanityName,
            };
        });
    }
    post(id, accessToken, postDetails, integration) {
        const _super = Object.create(null, {
            post: { get: () => super.post }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return _super.post.call(this, id, accessToken, postDetails, integration, 'company');
        });
    }
    comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        const _super = Object.create(null, {
            comment: { get: () => super.comment }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return _super.comment.call(this, id, postId, lastCommentId, accessToken, postDetails, integration, 'company');
        });
    }
    analytics(id, accessToken, date) {
        return __awaiter(this, void 0, void 0, function* () {
            const endDate = dayjs().unix() * 1000;
            const startDate = dayjs().subtract(date, 'days').unix() * 1000;
            const { elements } = yield (yield fetch(`https://api.linkedin.com/v2/organizationPageStatistics?q=organization&organization=${encodeURIComponent(`urn:li:organization:${id}`)}&timeIntervals=(timeRange:(start:${startDate},end:${endDate}),timeGranularityType:DAY)`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Linkedin-Version': '202601',
                    'X-Restli-Protocol-Version': '2.0.0',
                },
            })).json();
            const { elements: elements2 } = yield (yield fetch(`https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(`urn:li:organization:${id}`)}&timeIntervals=(timeRange:(start:${startDate},end:${endDate}),timeGranularityType:DAY)`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Linkedin-Version': '202601',
                    'X-Restli-Protocol-Version': '2.0.0',
                },
            })).json();
            const { elements: elements3 } = yield (yield fetch(`https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(`urn:li:organization:${id}`)}&timeIntervals=(timeRange:(start:${startDate},end:${endDate}),timeGranularityType:DAY)`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Linkedin-Version': '202601',
                    'X-Restli-Protocol-Version': '2.0.0',
                },
            })).json();
            const analytics = [...elements2, ...elements, ...elements3].reduce((all, current) => {
                var _a, _b, _c, _d, _e, _f, _g;
                if (typeof ((_c = (_b = (_a = current === null || current === void 0 ? void 0 : current.totalPageStatistics) === null || _a === void 0 ? void 0 : _a.views) === null || _b === void 0 ? void 0 : _b.allPageViews) === null || _c === void 0 ? void 0 : _c.pageViews) !== 'undefined') {
                    all['Page Views'].push({
                        total: current.totalPageStatistics.views.allPageViews.pageViews,
                        date: dayjs(current.timeRange.start).format('YYYY-MM-DD'),
                    });
                }
                if (typeof ((_d = current === null || current === void 0 ? void 0 : current.followerGains) === null || _d === void 0 ? void 0 : _d.organicFollowerGain) !== 'undefined') {
                    all['Organic Followers'].push({
                        total: (_e = current === null || current === void 0 ? void 0 : current.followerGains) === null || _e === void 0 ? void 0 : _e.organicFollowerGain,
                        date: dayjs(current.timeRange.start).format('YYYY-MM-DD'),
                    });
                }
                if (typeof ((_f = current === null || current === void 0 ? void 0 : current.followerGains) === null || _f === void 0 ? void 0 : _f.paidFollowerGain) !== 'undefined') {
                    all['Paid Followers'].push({
                        total: (_g = current === null || current === void 0 ? void 0 : current.followerGains) === null || _g === void 0 ? void 0 : _g.paidFollowerGain,
                        date: dayjs(current.timeRange.start).format('YYYY-MM-DD'),
                    });
                }
                if (typeof (current === null || current === void 0 ? void 0 : current.totalShareStatistics) !== 'undefined') {
                    all['Clicks'].push({
                        total: current === null || current === void 0 ? void 0 : current.totalShareStatistics.clickCount,
                        date: dayjs(current.timeRange.start).format('YYYY-MM-DD'),
                    });
                    all['Shares'].push({
                        total: current === null || current === void 0 ? void 0 : current.totalShareStatistics.shareCount,
                        date: dayjs(current.timeRange.start).format('YYYY-MM-DD'),
                    });
                    all['Engagement'].push({
                        total: current === null || current === void 0 ? void 0 : current.totalShareStatistics.engagement,
                        date: dayjs(current.timeRange.start).format('YYYY-MM-DD'),
                    });
                    all['Comments'].push({
                        total: current === null || current === void 0 ? void 0 : current.totalShareStatistics.commentCount,
                        date: dayjs(current.timeRange.start).format('YYYY-MM-DD'),
                    });
                }
                return all;
            }, {
                'Page Views': [],
                Clicks: [],
                Shares: [],
                Engagement: [],
                Comments: [],
                'Organic Followers': [],
                'Paid Followers': [],
            });
            return Object.keys(analytics).map((key) => ({
                label: key,
                data: analytics[key],
                percentageChange: 5,
            }));
        });
    }
    postAnalytics(integrationId, accessToken, postId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const endDate = dayjs().unix() * 1000;
            const startDate = dayjs().subtract(date, 'days').unix() * 1000;
            // Fetch share statistics for the specific post
            const shareStatsUrl = `https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(`urn:li:organization:${integrationId}`)}&shares=List(${encodeURIComponent(postId)})&timeIntervals=(timeRange:(start:${startDate},end:${endDate}),timeGranularityType:DAY)`;
            const { elements: shareElements } = yield (yield this.fetch(shareStatsUrl, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'LinkedIn-Version': '202601',
                    'X-Restli-Protocol-Version': '2.0.0',
                },
            })).json();
            // Also fetch social actions (likes, comments, shares) for the specific post
            let socialActions = null;
            try {
                const socialActionsUrl = `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postId)}`;
                socialActions = yield (yield this.fetch(socialActionsUrl, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'LinkedIn-Version': '202601',
                        'X-Restli-Protocol-Version': '2.0.0',
                    },
                })).json();
            }
            catch (e) {
                // Social actions may not be available for all posts
            }
            // Process share statistics into time series data
            const analytics = (shareElements || []).reduce((all, current) => {
                if (typeof (current === null || current === void 0 ? void 0 : current.totalShareStatistics) !== 'undefined') {
                    const dateStr = dayjs(current.timeRange.start).format('YYYY-MM-DD');
                    all['Impressions'].push({
                        total: current.totalShareStatistics.impressionCount || 0,
                        date: dateStr,
                    });
                    all['Unique Impressions'].push({
                        total: current.totalShareStatistics.uniqueImpressionsCount || 0,
                        date: dateStr,
                    });
                    all['Clicks'].push({
                        total: current.totalShareStatistics.clickCount || 0,
                        date: dateStr,
                    });
                    all['Likes'].push({
                        total: current.totalShareStatistics.likeCount || 0,
                        date: dateStr,
                    });
                    all['Comments'].push({
                        total: current.totalShareStatistics.commentCount || 0,
                        date: dateStr,
                    });
                    all['Shares'].push({
                        total: current.totalShareStatistics.shareCount || 0,
                        date: dateStr,
                    });
                    all['Engagement'].push({
                        total: current.totalShareStatistics.engagement || 0,
                        date: dateStr,
                    });
                }
                return all;
            }, {
                Impressions: [],
                'Unique Impressions': [],
                Clicks: [],
                Likes: [],
                Comments: [],
                Shares: [],
                Engagement: [],
            });
            // If no time series data but we have social actions, create a single data point
            if (Object.values(analytics).every((arr) => arr.length === 0) &&
                socialActions) {
                const today = dayjs().format('YYYY-MM-DD');
                analytics['Likes'].push({
                    total: ((_a = socialActions.likesSummary) === null || _a === void 0 ? void 0 : _a.totalLikes) || 0,
                    date: today,
                });
                analytics['Comments'].push({
                    total: ((_b = socialActions.commentsSummary) === null || _b === void 0 ? void 0 : _b.totalFirstLevelComments) || 0,
                    date: today,
                });
            }
            // Filter out empty analytics
            const result = Object.entries(analytics)
                .filter(([_, data]) => data.length > 0)
                .map(([label, data]) => ({
                label,
                data,
                percentageChange: 0,
            }));
            return result;
        });
    }
    autoRepostPost(integration, id, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            const { likesSummary: { totalLikes }, } = yield (yield this.fetch(`https://api.linkedin.com/v2/socialActions/${encodeURIComponent(id)}`, {
                method: 'GET',
                headers: {
                    'X-Restli-Protocol-Version': '2.0.0',
                    'Content-Type': 'application/json',
                    'LinkedIn-Version': '202601',
                    Authorization: `Bearer ${integration.token}`,
                },
            })).json();
            if (totalLikes >= +fields.likesAmount) {
                yield timer(2000);
                yield this.fetch(`https://api.linkedin.com/rest/posts`, {
                    body: JSON.stringify({
                        author: `urn:li:organization:${integration.internalId}`,
                        commentary: '',
                        visibility: 'PUBLIC',
                        distribution: {
                            feedDistribution: 'MAIN_FEED',
                            targetEntities: [],
                            thirdPartyDistributionChannels: [],
                        },
                        lifecycleState: 'PUBLISHED',
                        isReshareDisabledByAuthor: false,
                        reshareContext: {
                            parent: id,
                        },
                    }),
                    method: 'POST',
                    headers: {
                        'X-Restli-Protocol-Version': '2.0.0',
                        'Content-Type': 'application/json',
                        'LinkedIn-Version': '202601',
                        Authorization: `Bearer ${integration.token}`,
                    },
                });
                return true;
            }
            return false;
        });
    }
    autoPlugPost(integration, id, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            const { likesSummary: { totalLikes }, } = yield (yield this.fetch(`https://api.linkedin.com/v2/socialActions/${encodeURIComponent(id)}`, {
                method: 'GET',
                headers: {
                    'X-Restli-Protocol-Version': '2.0.0',
                    'Content-Type': 'application/json',
                    'LinkedIn-Version': '202601',
                    Authorization: `Bearer ${integration.token}`,
                },
            })).json();
            if (totalLikes >= fields.likesAmount) {
                yield timer(2000);
                yield this.fetch(`https://api.linkedin.com/v2/socialActions/${decodeURIComponent(id)}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${integration.token}`,
                    },
                    body: JSON.stringify({
                        actor: `urn:li:organization:${integration.internalId}`,
                        object: id,
                        message: {
                            text: this.fixText(fields.post),
                        },
                    }),
                });
                return true;
            }
            return false;
        });
    }
};
__decorate([
    Plug({
        identifier: 'linkedin-page-autoRepostPost',
        title: 'Auto Repost Posts',
        description: 'When a post reached a certain number of likes, repost it to increase engagement (1 week old posts)',
        runEveryMilliseconds: 21600000,
        totalRuns: 3,
        fields: [
            {
                name: 'likesAmount',
                type: 'number',
                placeholder: 'Amount of likes',
                description: 'The amount of likes to trigger the repost',
                validation: /^\d+$/,
            },
        ],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], LinkedinPageProvider.prototype, "autoRepostPost", null);
__decorate([
    Plug({
        identifier: 'linkedin-page-autoPlugPost',
        title: 'Auto plug post',
        description: 'When a post reached a certain number of likes, add another post to it so you followers get a notification about your promotion',
        runEveryMilliseconds: 21600000,
        totalRuns: 3,
        fields: [
            {
                name: 'likesAmount',
                type: 'number',
                placeholder: 'Amount of likes',
                description: 'The amount of likes to trigger the repost',
                validation: /^\d+$/,
            },
            {
                name: 'post',
                type: 'richtext',
                placeholder: 'Post to plug',
                description: 'Message content to plug',
                validation: /^[\s\S]{3,}$/g,
            },
        ],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], LinkedinPageProvider.prototype, "autoPlugPost", null);
LinkedinPageProvider = __decorate([
    Rules('LinkedIn can have maximum one attachment when selecting video, when choosing a carousel on LinkedIn minimum amount of attachment must be two, and only pictures, if uploading a video, LinkedIn can have only one attachment')
], LinkedinPageProvider);
export { LinkedinPageProvider };
//# sourceMappingURL=linkedin.page.provider.js.map