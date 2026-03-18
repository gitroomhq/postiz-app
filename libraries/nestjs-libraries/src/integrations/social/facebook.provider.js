import { __awaiter, __rest } from "tslib";
import { makeId } from "../../services/make.is";
import dayjs from 'dayjs';
import { SocialAbstract } from "../social.abstract";
import { FacebookDto } from "../../dtos/posts/providers-settings/facebook.dto";
export class FacebookProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'facebook';
        this.name = 'Facebook Page';
        this.isBetweenSteps = true;
        this.scopes = [
            'pages_show_list',
            'business_management',
            'pages_manage_posts',
            'pages_manage_engagement',
            'pages_read_engagement',
            'read_insights',
        ];
        this.maxConcurrentJob = 100; // Facebook has reasonable rate limits
        this.editor = 'normal';
        this.dto = FacebookDto;
    }
    maxLength() {
        return 63206;
    }
    handleErrors(body) {
        // Access token validation errors - require re-authentication
        if (body.indexOf('Error validating access token') > -1) {
            return {
                type: 'refresh-token',
                value: 'Please re-authenticate your Facebook account',
            };
        }
        if (body.indexOf('490') > -1) {
            return {
                type: 'refresh-token',
                value: 'Access token expired, please re-authenticate',
            };
        }
        if (body.indexOf('REVOKED_ACCESS_TOKEN') > -1) {
            return {
                type: 'refresh-token',
                value: 'Access token has been revoked, please re-authenticate',
            };
        }
        if (body.indexOf('1366046') > -1) {
            return {
                type: 'bad-body',
                value: 'Photos should be smaller than 4 MB and saved as JPG, PNG',
            };
        }
        if (body.indexOf('1390008') > -1) {
            return {
                type: 'bad-body',
                value: 'You are posting too fast, please slow down',
            };
        }
        // Content policy violations
        if (body.indexOf('1346003') > -1) {
            return {
                type: 'bad-body',
                value: 'Content flagged as abusive by Facebook',
            };
        }
        if (body.indexOf('1404006') > -1) {
            return {
                type: 'bad-body',
                value: "We couldn't post your comment, A security check in facebook required to proceed.",
            };
        }
        if (body.indexOf('1404102') > -1) {
            return {
                type: 'bad-body',
                value: 'Content violates Facebook Community Standards',
            };
        }
        // Permission errors
        if (body.indexOf('1404078') > -1) {
            return {
                type: 'refresh-token',
                value: 'Page publishing authorization required, please re-authenticate',
            };
        }
        if (body.indexOf('1609008') > -1) {
            return {
                type: 'bad-body',
                value: 'Cannot post Facebook.com links',
            };
        }
        // Parameter validation errors
        if (body.indexOf('2061006') > -1) {
            return {
                type: 'bad-body',
                value: 'Invalid URL format in post content',
            };
        }
        if (body.indexOf('1349125') > -1) {
            return {
                type: 'bad-body',
                value: 'Invalid content format',
            };
        }
        if (body.indexOf('1404112') > -1) {
            return {
                type: 'bad-body',
                value: 'For security reasons, your account has limited access to the site for a few days',
            };
        }
        if (body.indexOf('Name parameter too long') > -1) {
            return {
                type: 'bad-body',
                value: 'Post content is too long',
            };
        }
        // Service errors - checking specific subcodes first
        if (body.indexOf('1363047') > -1) {
            return {
                type: 'bad-body',
                value: 'Facebook service temporarily unavailable',
            };
        }
        if (body.indexOf('1609010') > -1) {
            return {
                type: 'bad-body',
                value: 'Facebook service temporarily unavailable',
            };
        }
        return undefined;
    }
    refreshToken(refresh_token) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                refreshToken: '',
                expiresIn: 0,
                accessToken: '',
                id: '',
                name: '',
                picture: '',
                username: '',
            };
        });
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            const state = makeId(6);
            return {
                url: 'https://www.facebook.com/v20.0/dialog/oauth' +
                    `?client_id=${process.env.FACEBOOK_APP_ID}` +
                    `&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/facebook`)}` +
                    `&state=${state}` +
                    `&scope=${this.scopes.join(',')}`,
                codeVerifier: makeId(10),
                state,
            };
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
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const getAccessToken = yield (yield fetch('https://graph.facebook.com/v20.0/oauth/access_token' +
                `?client_id=${process.env.FACEBOOK_APP_ID}` +
                `&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/facebook${params.refresh ? `?refresh=${params.refresh}` : ''}`)}` +
                `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
                `&code=${params.code}`)).json();
            const { access_token } = yield (yield fetch('https://graph.facebook.com/v20.0/oauth/access_token' +
                '?grant_type=fb_exchange_token' +
                `&client_id=${process.env.FACEBOOK_APP_ID}` +
                `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
                `&fb_exchange_token=${getAccessToken.access_token}&fields=access_token,expires_in`)).json();
            const { data } = yield (yield fetch(`https://graph.facebook.com/v20.0/me/permissions?access_token=${access_token}`)).json();
            const permissions = data
                .filter((d) => d.status === 'granted')
                .map((p) => p.permission);
            this.checkScopes(this.scopes, permissions);
            const { id, name, picture } = yield (yield fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,picture&access_token=${access_token}`)).json();
            return {
                id,
                name,
                accessToken: access_token,
                refreshToken: access_token,
                expiresIn: dayjs().add(59, 'days').unix() - dayjs().unix(),
                picture: ((_a = picture === null || picture === void 0 ? void 0 : picture.data) === null || _a === void 0 ? void 0 : _a.url) || '',
                username: '',
            };
        });
    }
    pages(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const seenIds = new Set();
            const allPages = [];
            const fetchPaginated = (startUrl) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                let nextUrl = startUrl;
                while (nextUrl) {
                    const response = yield (yield fetch(nextUrl)).json();
                    if (response.data) {
                        for (const page of response.data) {
                            if (!seenIds.has(page.id)) {
                                seenIds.add(page.id);
                                allPages.push(page);
                            }
                        }
                    }
                    nextUrl = (_a = response.paging) === null || _a === void 0 ? void 0 : _a.next;
                }
            });
            // Fetch pages the user explicitly shared during the OAuth dialog
            yield fetchPaginated(`https://graph.facebook.com/v20.0/me/accounts?fields=id,username,name,access_token,picture.type(large)&limit=100&access_token=${accessToken}`);
            // Also fetch pages via Business Manager API to discover pages
            // not selected during the OAuth page selection step
            try {
                let bizUrl = `https://graph.facebook.com/v20.0/me/businesses?access_token=${accessToken}`;
                while (bizUrl) {
                    const bizResponse = yield (yield fetch(bizUrl)).json();
                    if (bizResponse.data) {
                        for (const business of bizResponse.data) {
                            try {
                                yield fetchPaginated(`https://graph.facebook.com/v20.0/${business.id}/owned_pages?fields=id,username,name,access_token,picture.type(large)&limit=100&access_token=${accessToken}`);
                            }
                            catch (_b) {
                                // Continue with other businesses
                            }
                            try {
                                yield fetchPaginated(`https://graph.facebook.com/v20.0/${business.id}/client_pages?fields=id,username,name,access_token,picture.type(large)&limit=100&access_token=${accessToken}`);
                            }
                            catch (_c) {
                                // Continue with other businesses
                            }
                        }
                    }
                    bizUrl = (_a = bizResponse.paging) === null || _a === void 0 ? void 0 : _a.next;
                }
            }
            catch (_d) {
                // Business Manager API not available for all users
            }
            return allPages;
        });
    }
    fetchPageInformation(accessToken, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const pageId = data.page;
            const fields = 'id,username,name,access_token,picture.type(large)';
            const searchPaginated = (startUrl) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                let url = startUrl;
                while (url) {
                    const response = yield (yield fetch(url)).json();
                    if (response.data) {
                        const page = response.data.find((p) => String(p.id) === String(pageId));
                        if (page) {
                            return {
                                id: page.id,
                                name: page.name,
                                access_token: page.access_token,
                                picture: ((_b = (_a = page.picture) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.url) || '',
                                username: page.username,
                            };
                        }
                    }
                    url = (_c = response.paging) === null || _c === void 0 ? void 0 : _c.next;
                }
                return null;
            });
            // 1. Check /me/accounts
            const fromAccounts = yield searchPaginated(`https://graph.facebook.com/v20.0/me/accounts?fields=${fields}&limit=100&access_token=${accessToken}`);
            if (fromAccounts)
                return fromAccounts;
            // 2. Check Business Manager owned_pages and client_pages
            try {
                let bizUrl = `https://graph.facebook.com/v20.0/me/businesses?access_token=${accessToken}`;
                while (bizUrl) {
                    const bizResponse = yield (yield fetch(bizUrl)).json();
                    if (bizResponse.data) {
                        for (const business of bizResponse.data) {
                            try {
                                const fromOwned = yield searchPaginated(`https://graph.facebook.com/v20.0/${business.id}/owned_pages?fields=${fields}&limit=100&access_token=${accessToken}`);
                                if (fromOwned)
                                    return fromOwned;
                            }
                            catch (_b) {
                                // Continue with other businesses
                            }
                            try {
                                const fromClient = yield searchPaginated(`https://graph.facebook.com/v20.0/${business.id}/client_pages?fields=${fields}&limit=100&access_token=${accessToken}`);
                                if (fromClient)
                                    return fromClient;
                            }
                            catch (_c) {
                                // Continue with other businesses
                            }
                        }
                    }
                    bizUrl = (_a = bizResponse.paging) === null || _a === void 0 ? void 0 : _a.next;
                }
            }
            catch (_d) {
                // Business Manager API not available for all users
            }
            throw new Error('Page not found in your accounts');
        });
    }
    post(id, accessToken, postDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            const [firstPost] = postDetails;
            let finalId = '';
            let finalUrl = '';
            if ((((_c = (_b = (_a = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.path) === null || _c === void 0 ? void 0 : _c.indexOf('mp4')) || -2) > -1) {
                const _h = yield (yield this.fetch(`https://graph.facebook.com/v20.0/${id}/videos?access_token=${accessToken}&fields=id,permalink_url`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        file_url: (_e = (_d = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.path,
                        description: firstPost.message,
                        published: true,
                    }),
                }, 'upload mp4')).json(), { id: videoId, permalink_url } = _h, all = __rest(_h, ["id", "permalink_url"]);
                finalUrl = 'https://www.facebook.com/reel/' + videoId;
                finalId = videoId;
            }
            else {
                const uploadPhotos = !((_f = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _f === void 0 ? void 0 : _f.length)
                    ? []
                    : yield Promise.all(firstPost.media.map((media) => __awaiter(this, void 0, void 0, function* () {
                        const { id: photoId } = yield (yield this.fetch(`https://graph.facebook.com/v20.0/${id}/photos?access_token=${accessToken}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                url: media.path,
                                published: false,
                            }),
                        }, 'upload images slides')).json();
                        return { media_fbid: photoId };
                    })));
                const _j = yield (yield this.fetch(`https://graph.facebook.com/v20.0/${id}/feed?access_token=${accessToken}&fields=id,permalink_url`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(Object.assign(Object.assign(Object.assign({}, ((uploadPhotos === null || uploadPhotos === void 0 ? void 0 : uploadPhotos.length) ? { attached_media: uploadPhotos } : {})), (((_g = firstPost === null || firstPost === void 0 ? void 0 : firstPost.settings) === null || _g === void 0 ? void 0 : _g.url)
                        ? { link: firstPost.settings.url }
                        : {})), { message: firstPost.message, published: true })),
                }, 'finalize upload')).json(), { id: postId, permalink_url } = _j, all = __rest(_j, ["id", "permalink_url"]);
                finalUrl = permalink_url;
                finalId = postId;
            }
            return [
                {
                    id: firstPost.id,
                    postId: finalId,
                    releaseURL: finalUrl,
                    status: 'success',
                },
            ];
        });
    }
    comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const [commentPost] = postDetails;
            const replyToId = lastCommentId || postId;
            const data = yield (yield this.fetch(`https://graph.facebook.com/v20.0/${replyToId}/comments?access_token=${accessToken}&fields=id,permalink_url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(Object.assign(Object.assign({}, (((_a = commentPost.media) === null || _a === void 0 ? void 0 : _a.length)
                    ? { attachment_url: commentPost.media[0].path }
                    : {})), { message: commentPost.message })),
            }, 'add comment')).json();
            return [
                {
                    id: commentPost.id,
                    postId: data.id,
                    releaseURL: data.permalink_url,
                    status: 'success',
                },
            ];
        });
    }
    analytics(id, accessToken, date) {
        return __awaiter(this, void 0, void 0, function* () {
            const until = dayjs().endOf('day').unix();
            const since = dayjs().subtract(date, 'day').unix();
            const { data } = yield (yield fetch(`https://graph.facebook.com/v20.0/${id}/insights?metric=page_impressions_unique,page_posts_impressions_unique,page_post_engagements,page_daily_follows,page_video_views&access_token=${accessToken}&period=day&since=${since}&until=${until}`)).json();
            return ((data === null || data === void 0 ? void 0 : data.map((d) => {
                var _a;
                return ({
                    label: d.name === 'page_impressions_unique'
                        ? 'Page Impressions'
                        : d.name === 'page_post_engagements'
                            ? 'Posts Engagement'
                            : d.name === 'page_daily_follows'
                                ? 'Page followers'
                                : d.name === 'page_video_views'
                                    ? 'Videos views'
                                    : 'Posts Impressions',
                    percentageChange: 5,
                    data: (_a = d === null || d === void 0 ? void 0 : d.values) === null || _a === void 0 ? void 0 : _a.map((v) => ({
                        total: v.value,
                        date: dayjs(v.end_time).format('YYYY-MM-DD'),
                    })),
                });
            })) || []);
        });
    }
    postAnalytics(integrationId, accessToken, postId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const today = dayjs().format('YYYY-MM-DD');
            try {
                // Fetch post insights from Facebook Graph API
                const { data } = yield (yield this.fetch(`https://graph.facebook.com/v20.0/${postId}/insights?metric=post_impressions_unique,post_reactions_by_type_total,post_clicks,post_clicks_by_type&access_token=${accessToken}`)).json();
                if (!data || data.length === 0) {
                    return [];
                }
                const result = [];
                for (const metric of data) {
                    const value = (_b = (_a = metric.values) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value;
                    if (value === undefined)
                        continue;
                    let label = '';
                    let total = '';
                    switch (metric.name) {
                        case 'post_impressions_unique':
                            label = 'Impressions';
                            total = String(value);
                            break;
                        case 'post_clicks':
                            label = 'Clicks';
                            total = String(value);
                            break;
                        case 'post_clicks_by_type':
                            // This returns an object with click types
                            if (typeof value === 'object') {
                                const totalClicks = Object.values(value).reduce((sum, v) => sum + v, 0);
                                label = 'Clicks by Type';
                                total = String(totalClicks);
                            }
                            break;
                        case 'post_reactions_by_type_total':
                            // This returns an object with reaction types
                            if (typeof value === 'object') {
                                const totalReactions = Object.values(value).reduce((sum, v) => sum + v, 0);
                                label = 'Reactions';
                                total = String(totalReactions);
                            }
                            break;
                    }
                    if (label) {
                        result.push({
                            label,
                            percentageChange: 0,
                            data: [{ total, date: today }],
                        });
                    }
                }
                return result;
            }
            catch (err) {
                console.error('Error fetching Facebook post analytics:', err);
                return [];
            }
        });
    }
}
//# sourceMappingURL=facebook.provider.js.map