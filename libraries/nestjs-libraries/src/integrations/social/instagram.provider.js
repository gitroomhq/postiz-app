import { __awaiter, __decorate, __rest } from "tslib";
import { makeId } from "../../services/make.is";
import { timer } from "../../../../helpers/src/utils/timer";
import dayjs from 'dayjs';
import { SocialAbstract } from "../social.abstract";
import { InstagramDto } from "../../dtos/posts/providers-settings/instagram.dto";
import { Rules } from "../../chat/rules.description.decorator";
let InstagramProvider = class InstagramProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'instagram';
        this.name = 'Instagram\n(Facebook Business)';
        this.isBetweenSteps = true;
        this.toolTip = 'Instagram must be business and connected to a Facebook page';
        this.scopes = [
            'instagram_basic',
            'pages_show_list',
            'pages_read_engagement',
            'business_management',
            'instagram_content_publish',
            'instagram_manage_comments',
            'instagram_manage_insights',
        ];
        this.maxConcurrentJob = 400;
        this.editor = 'normal';
        this.dto = InstagramDto;
    }
    maxLength() {
        return 2200;
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
    handleErrors(body) {
        if (body.indexOf('An unknown error occurred') > -1) {
            return {
                type: 'retry',
                value: 'An unknown error occurred, please try again later',
            };
        }
        if (body.indexOf('2207081') > -1) {
            return {
                type: 'bad-body',
                value: "This account doesn't support Trial Reels",
            };
        }
        if (body.indexOf('REVOKED_ACCESS_TOKEN') > -1) {
            return {
                type: 'refresh-token',
                value: 'Something is wrong with your connected user, please re-authenticate',
            };
        }
        if (body.toLowerCase().indexOf('the user is not an instagram business') > -1) {
            return {
                type: 'refresh-token',
                value: 'Your Instagram account is not a business account, please convert it to a business account',
            };
        }
        if (body.toLowerCase().indexOf('session has been invalidated') > -1) {
            return {
                type: 'refresh-token',
                value: 'Please re-authenticate your Instagram account',
            };
        }
        if (body.indexOf('2207050') > -1) {
            return {
                type: 'bad-body',
                value: 'Instagram user is restricted',
            };
        }
        // Media download/upload errors
        if (body.indexOf('2207003') > -1) {
            return {
                type: 'bad-body',
                value: 'Timeout downloading media, please try again',
            };
        }
        if (body.indexOf('2207020') > -1) {
            return {
                type: 'bad-body',
                value: 'Media expired, please upload again',
            };
        }
        if (body.indexOf('2207032') > -1) {
            return {
                type: 'bad-body',
                value: 'Failed to create media, please try again',
            };
        }
        if (body.indexOf('2207053') > -1) {
            return {
                type: 'bad-body',
                value: 'Unknown upload error, please try again',
            };
        }
        if (body.indexOf('2207052') > -1) {
            return {
                type: 'bad-body',
                value: 'Media fetch failed, please try again',
            };
        }
        if (body.indexOf('2207057') > -1) {
            return {
                type: 'bad-body',
                value: 'Invalid thumbnail offset for video',
            };
        }
        if (body.indexOf('2207026') > -1) {
            return {
                type: 'bad-body',
                value: 'Unsupported video format',
            };
        }
        if (body.indexOf('2207023') > -1) {
            return {
                type: 'bad-body',
                value: 'Unknown media type',
            };
        }
        if (body.indexOf('2207006') > -1) {
            return {
                type: 'bad-body',
                value: 'Media not found, please upload again',
            };
        }
        if (body.indexOf('2207008') > -1) {
            return {
                type: 'bad-body',
                value: 'Media builder expired, please try again',
            };
        }
        // Content validation errors
        if (body.indexOf('2207028') > -1) {
            return {
                type: 'bad-body',
                value: 'Carousel validation failed',
            };
        }
        if (body.indexOf('2207010') > -1) {
            return {
                type: 'bad-body',
                value: 'Caption is too long',
            };
        }
        // Product tagging errors
        if (body.indexOf('2207035') > -1) {
            return {
                type: 'bad-body',
                value: 'Product tag positions not supported for videos',
            };
        }
        if (body.indexOf('2207036') > -1) {
            return {
                type: 'bad-body',
                value: 'Product tag positions required for photos',
            };
        }
        if (body.indexOf('2207037') > -1) {
            return {
                type: 'bad-body',
                value: 'Product tag validation failed',
            };
        }
        if (body.indexOf('2207040') > -1) {
            return {
                type: 'bad-body',
                value: 'Too many product tags',
            };
        }
        // Image format/size errors
        if (body.indexOf('2207004') > -1) {
            return {
                type: 'bad-body',
                value: 'Image is too large',
            };
        }
        if (body.indexOf('2207005') > -1) {
            return {
                type: 'bad-body',
                value: 'Unsupported image format',
            };
        }
        if (body.indexOf('2207009') > -1) {
            return {
                type: 'bad-body',
                value: 'Aspect ratio not supported, must be between 4:5 to 1.91:1',
            };
        }
        if (body.indexOf('Page request limit reached') > -1) {
            return {
                type: 'bad-body',
                value: 'Page posting for today is limited, please try again tomorrow',
            };
        }
        if (body.indexOf('2207042') > -1) {
            return {
                type: 'bad-body',
                value: 'You have reached the maximum of 25 posts per day, allowed for your account',
            };
        }
        if (body.indexOf('Not enough permissions to post') > -1) {
            return {
                type: 'bad-body',
                value: 'Not enough permissions to post',
            };
        }
        if (body.indexOf('36003') > -1) {
            return {
                type: 'bad-body',
                value: 'Aspect ratio not supported, must be between 4:5 to 1.91:1',
            };
        }
        if (body.indexOf('190,') > -1) {
            return {
                type: 'bad-body',
                value: 'The account is missing some permissions to perform this action, please re-add the account and allow all permissions',
            };
        }
        if (body.indexOf('36001') > -1) {
            return {
                type: 'bad-body',
                value: 'Invalid Instagram image resolution max: 1920x1080px',
            };
        }
        if (body.indexOf('2207051') > -1) {
            return {
                type: 'bad-body',
                value: 'Instagram blocked your request',
            };
        }
        if (body.indexOf('2207001') > -1) {
            return {
                type: 'bad-body',
                value: 'Instagram detected that your post is spam, please try again with different content',
            };
        }
        if (body.indexOf('2207027') > -1) {
            return {
                type: 'bad-body',
                value: 'Unknown error, please try again later or contact support',
            };
        }
        if (body.indexOf('param collaborators is not allowed') > -1) {
            return {
                type: 'bad-body',
                value: 'Collaborators are not allowed for carousel'
            };
        }
        return undefined;
    }
    reConnect(id, requiredId, accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const findPage = (yield this.pages(accessToken)).find((p) => p.id === requiredId);
            const information = yield this.fetchPageInformation(accessToken, {
                id: requiredId,
                pageId: findPage === null || findPage === void 0 ? void 0 : findPage.pageId,
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
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            const state = makeId(6);
            return {
                url: 'https://www.facebook.com/v20.0/dialog/oauth' +
                    `?client_id=${process.env.FACEBOOK_APP_ID}` +
                    `&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/instagram`)}` +
                    `&state=${state}` +
                    `&scope=${encodeURIComponent(this.scopes.join(','))}`,
                codeVerifier: makeId(10),
                state,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const getAccessToken = yield (yield fetch('https://graph.facebook.com/v20.0/oauth/access_token' +
                `?client_id=${process.env.FACEBOOK_APP_ID}` +
                `&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/instagram${params.refresh ? `?refresh=${params.refresh}` : ''}`)}` +
                `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
                `&code=${params.code}`)).json();
            const _b = yield (yield fetch('https://graph.facebook.com/v20.0/oauth/access_token' +
                '?grant_type=fb_exchange_token' +
                `&client_id=${process.env.FACEBOOK_APP_ID}` +
                `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
                `&fb_exchange_token=${getAccessToken.access_token}`)).json(), { access_token, expires_in } = _b, all = __rest(_b, ["access_token", "expires_in"]);
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
            const seenPageIds = new Set();
            const allFacebookPages = [];
            const fetchPaginated = (startUrl) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                let nextUrl = startUrl;
                while (nextUrl) {
                    const response = yield (yield fetch(nextUrl)).json();
                    if (response.data) {
                        for (const page of response.data) {
                            if (!seenPageIds.has(page.id)) {
                                seenPageIds.add(page.id);
                                allFacebookPages.push(page);
                            }
                        }
                    }
                    nextUrl = (_a = response.paging) === null || _a === void 0 ? void 0 : _a.next;
                }
            });
            // Fetch pages the user explicitly shared during the OAuth dialog
            yield fetchPaginated(`https://graph.facebook.com/v20.0/me/accounts?fields=id,instagram_business_account,username,name,picture.type(large)&limit=100&access_token=${accessToken}`);
            // Also fetch pages via Business Manager API to discover pages
            // not selected during the OAuth page selection step
            try {
                let bizUrl = `https://graph.facebook.com/v20.0/me/businesses?access_token=${accessToken}`;
                while (bizUrl) {
                    const bizResponse = yield (yield fetch(bizUrl)).json();
                    if (bizResponse.data) {
                        for (const business of bizResponse.data) {
                            try {
                                yield fetchPaginated(`https://graph.facebook.com/v20.0/${business.id}/owned_pages?fields=id,instagram_business_account,username,name,picture.type(large)&limit=100&access_token=${accessToken}`);
                            }
                            catch (_b) {
                                // Continue with other businesses
                            }
                            try {
                                yield fetchPaginated(`https://graph.facebook.com/v20.0/${business.id}/client_pages?fields=id,instagram_business_account,username,name,picture.type(large)&limit=100&access_token=${accessToken}`);
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
            const onlyConnectedAccounts = yield Promise.all(allFacebookPages
                .filter((f) => f.instagram_business_account)
                .map((p) => __awaiter(this, void 0, void 0, function* () {
                return Object.assign(Object.assign({ pageId: p.id }, (yield (yield fetch(`https://graph.facebook.com/v20.0/${p.instagram_business_account.id}?fields=name,profile_picture_url&access_token=${accessToken}`)).json())), { id: p.instagram_business_account.id });
            })));
            return onlyConnectedAccounts.map((p) => ({
                pageId: p.pageId,
                id: p.id,
                name: p.name,
                picture: { data: { url: p.profile_picture_url } },
            }));
        });
    }
    fetchPageInformation(accessToken, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const _a = yield (yield fetch(`https://graph.facebook.com/v20.0/${data.pageId}?fields=access_token,name,picture.type(large)&access_token=${accessToken}`)).json(), { access_token } = _a, all = __rest(_a, ["access_token"]);
            const { id, name, profile_picture_url, username } = yield (yield fetch(`https://graph.facebook.com/v20.0/${data.id}?fields=username,name,profile_picture_url&access_token=${accessToken}`)).json();
            return {
                id,
                name,
                picture: profile_picture_url,
                access_token,
                username,
            };
        });
    }
    post(id_1, accessToken_1, postDetails_1, integration_1) {
        return __awaiter(this, arguments, void 0, function* (id, accessToken, postDetails, integration, type = 'graph.facebook.com') {
            var _a;
            const [firstPost] = postDetails;
            console.log('in progress', id);
            const isStory = firstPost.settings.post_type === 'story';
            const isTrialReel = !!firstPost.settings.is_trial_reel;
            const medias = yield Promise.all(((_a = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _a === void 0 ? void 0 : _a.map((m) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d, _e, _f;
                const caption = ((_a = firstPost.media) === null || _a === void 0 ? void 0 : _a.length) === 1
                    ? `&caption=${encodeURIComponent(firstPost.message)}`
                    : ``;
                const isCarousel = (((_b = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _b === void 0 ? void 0 : _b.length) || 0) > 1 && !isStory ? `&is_carousel_item=true` : ``;
                const mediaType = m.path.indexOf('.mp4') > -1
                    ? ((_c = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _c === void 0 ? void 0 : _c.length) === 1
                        ? isStory
                            ? `video_url=${m.path}&media_type=STORIES`
                            : `video_url=${m.path}&media_type=REELS&thumb_offset=${(m === null || m === void 0 ? void 0 : m.thumbnailTimestamp) || 0}`
                        : isStory
                            ? `video_url=${m.path}&media_type=STORIES`
                            : `video_url=${m.path}&media_type=VIDEO&thumb_offset=${(m === null || m === void 0 ? void 0 : m.thumbnailTimestamp) || 0}`
                    : isStory
                        ? `image_url=${m.path}&media_type=STORIES`
                        : `image_url=${m.path}`;
                const trialParams = isTrialReel
                    ? `&trial_params=${encodeURIComponent(JSON.stringify({
                        graduation_strategy: firstPost.settings.graduation_strategy || 'MANUAL',
                    }))}`
                    : ``;
                const collaborators = ((_e = (_d = firstPost === null || firstPost === void 0 ? void 0 : firstPost.settings) === null || _d === void 0 ? void 0 : _d.collaborators) === null || _e === void 0 ? void 0 : _e.length) && !isStory
                    ? `&collaborators=${JSON.stringify((_f = firstPost === null || firstPost === void 0 ? void 0 : firstPost.settings) === null || _f === void 0 ? void 0 : _f.collaborators.map((p) => p.label))}`
                    : ``;
                const { id: photoId } = yield (yield this.fetch(`https://${type}/v20.0/${id}/media?${mediaType}${isCarousel}${collaborators}${trialParams}&access_token=${accessToken}${caption}`, {
                    method: 'POST',
                })).json();
                console.log('in progress2', id);
                let status = 'IN_PROGRESS';
                while (status === 'IN_PROGRESS') {
                    const { status_code } = yield (yield this.fetch(`https://${type}/v20.0/${photoId}?access_token=${accessToken}&fields=status_code`, undefined, '', 0, true)).json();
                    yield timer(30000);
                    status = status_code;
                }
                console.log('in progress3', id);
                return photoId;
            }))) || []);
            if (isStory && medias.length > 1) {
                // Stories don't support carousels - publish each media as a separate story
                let lastMediaId = '';
                let lastPermalink = '';
                for (const mediaCreationId of medias) {
                    const { id: mediaId } = yield (yield this.fetch(`https://${type}/v20.0/${id}/media_publish?creation_id=${mediaCreationId}&access_token=${accessToken}&field=id`, {
                        method: 'POST',
                    })).json();
                    lastMediaId = mediaId;
                    const { permalink } = yield (yield this.fetch(`https://${type}/v20.0/${mediaId}?fields=permalink&access_token=${accessToken}`)).json();
                    lastPermalink = permalink;
                }
                return [
                    {
                        id: firstPost.id,
                        postId: lastMediaId,
                        releaseURL: lastPermalink,
                        status: 'success',
                    },
                ];
            }
            else if (medias.length === 1) {
                const { id: mediaId } = yield (yield this.fetch(`https://${type}/v20.0/${id}/media_publish?creation_id=${medias[0]}&access_token=${accessToken}&field=id`, {
                    method: 'POST',
                })).json();
                const { permalink } = yield (yield this.fetch(`https://${type}/v20.0/${mediaId}?fields=permalink&access_token=${accessToken}`)).json();
                return [
                    {
                        id: firstPost.id,
                        postId: mediaId,
                        releaseURL: permalink,
                        status: 'success',
                    },
                ];
            }
            else {
                const _b = yield (yield this.fetch(`https://${type}/v20.0/${id}/media?caption=${encodeURIComponent(firstPost === null || firstPost === void 0 ? void 0 : firstPost.message)}&media_type=CAROUSEL&children=${encodeURIComponent(medias.join(','))}&access_token=${accessToken}`, {
                    method: 'POST',
                })).json(), { id: containerId } = _b, all3 = __rest(_b, ["id"]);
                let status = 'IN_PROGRESS';
                while (status === 'IN_PROGRESS') {
                    const { status_code } = yield (yield this.fetch(`https://${type}/v20.0/${containerId}?fields=status_code&access_token=${accessToken}`, undefined, '', 0, true)).json();
                    yield timer(30000);
                    status = status_code;
                }
                const _c = yield (yield this.fetch(`https://${type}/v20.0/${id}/media_publish?creation_id=${containerId}&access_token=${accessToken}&field=id`, {
                    method: 'POST',
                })).json(), { id: mediaId } = _c, all4 = __rest(_c, ["id"]);
                const { permalink } = yield (yield this.fetch(`https://${type}/v20.0/${mediaId}?fields=permalink&access_token=${accessToken}`)).json();
                return [
                    {
                        id: firstPost.id,
                        postId: mediaId,
                        releaseURL: permalink,
                        status: 'success',
                    },
                ];
            }
        });
    }
    comment(id_1, postId_1, lastCommentId_1, accessToken_1, postDetails_1, integration_1) {
        return __awaiter(this, arguments, void 0, function* (id, postId, lastCommentId, accessToken, postDetails, integration, type = 'graph.facebook.com') {
            const [commentPost] = postDetails;
            const { id: commentId } = yield (yield this.fetch(`https://${type}/v20.0/${postId}/comments?message=${encodeURIComponent(commentPost.message)}&access_token=${accessToken}`, {
                method: 'POST',
            })).json();
            // Get the permalink from the parent post
            const { permalink } = yield (yield this.fetch(`https://${type}/v20.0/${postId}?fields=permalink&access_token=${accessToken}`)).json();
            return [
                {
                    id: commentPost.id,
                    postId: commentId,
                    releaseURL: permalink,
                    status: 'success',
                },
            ];
        });
    }
    setTitle(name) {
        switch (name) {
            case 'likes': {
                return 'Likes';
            }
            case 'followers': {
                return 'Followers';
            }
            case 'reach': {
                return 'Reach';
            }
            case 'follower_count': {
                return 'Follower Count';
            }
            case 'views': {
                return 'Views';
            }
            case 'comments': {
                return 'Comments';
            }
            case 'shares': {
                return 'Shares';
            }
            case 'saves': {
                return 'Saves';
            }
            case 'replies': {
                return 'Replies';
            }
        }
        return '';
    }
    analytics(id_1, accessToken_1, date_1) {
        return __awaiter(this, arguments, void 0, function* (id, accessToken, date, type = 'graph.facebook.com') {
            const until = dayjs().endOf('day').unix();
            const since = dayjs().subtract(date, 'day').unix();
            const _a = yield (yield fetch(`https://${type}/v21.0/${id}/insights?metric=follower_count,reach&access_token=${accessToken}&period=day&since=${since}&until=${until}`)).json(), { data } = _a, all = __rest(_a, ["data"]);
            const _b = yield (yield fetch(`https://${type}/v21.0/${id}/insights?metric_type=total_value&metric=likes,views,comments,shares,saves,replies&access_token=${accessToken}&period=day&since=${since}&until=${until}`)).json(), { data: data2 } = _b, all2 = __rest(_b, ["data"]);
            const analytics = [];
            analytics.push(...((data === null || data === void 0 ? void 0 : data.map((d) => ({
                label: this.setTitle(d.name),
                percentageChange: 5,
                data: d.values.map((v) => ({
                    total: v.value,
                    date: dayjs(v.end_time).format('YYYY-MM-DD'),
                })),
            }))) || []));
            analytics.push(...data2.map((d) => ({
                label: this.setTitle(d.name),
                percentageChange: 5,
                data: [
                    {
                        total: d.total_value.value,
                        date: dayjs().format('YYYY-MM-DD'),
                    },
                    {
                        total: d.total_value.value,
                        date: dayjs().add(1, 'day').format('YYYY-MM-DD'),
                    },
                ],
            })));
            return analytics;
        });
    }
    music(accessToken, data) {
        return this.fetch(`https://graph.facebook.com/v20.0/music/search?q=${encodeURIComponent(data.q)}&access_token=${accessToken}`);
    }
    postAnalytics(integrationId_1, accessToken_1, postId_1, date_1) {
        return __awaiter(this, arguments, void 0, function* (integrationId, accessToken, postId, date, type = 'graph.facebook.com') {
            var _a, _b;
            const today = dayjs().format('YYYY-MM-DD');
            try {
                // Fetch media insights from Instagram Graph API
                const { data } = yield (yield this.fetch(`https://${type}/v21.0/${postId}/insights?metric=views,reach,saved,likes,comments,shares&access_token=${accessToken}`)).json();
                if (!data || data.length === 0) {
                    return [];
                }
                const result = [];
                for (const metric of data) {
                    const value = (_b = (_a = metric.values) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value;
                    if (value === undefined)
                        continue;
                    let label = '';
                    switch (metric.name) {
                        case 'views':
                            label = 'Views';
                            break;
                        case 'reach':
                            label = 'Reach';
                            break;
                        case 'engagement':
                            label = 'Engagement';
                            break;
                        case 'saved':
                            label = 'Saves';
                            break;
                        case 'likes':
                            label = 'Likes';
                            break;
                        case 'comments':
                            label = 'Comments';
                            break;
                        case 'shares':
                            label = 'Shares';
                            break;
                    }
                    if (label) {
                        result.push({
                            label,
                            percentageChange: 0,
                            data: [{ total: String(value), date: today }],
                        });
                    }
                }
                return result;
            }
            catch (err) {
                console.error('Error fetching Instagram post analytics:', err);
                return [];
            }
        });
    }
};
InstagramProvider = __decorate([
    Rules("Instagram should have at least one attachment, if it's a story, it can have only one picture")
], InstagramProvider);
export { InstagramProvider };
//# sourceMappingURL=instagram.provider.js.map