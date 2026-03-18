import { __awaiter, __decorate, __metadata, __rest } from "tslib";
import { makeId } from "../../services/make.is";
import { timer } from "../../../../helpers/src/utils/timer";
import dayjs from 'dayjs';
import { SocialAbstract } from "../social.abstract";
import { capitalize } from 'lodash';
import { Plug } from "../../../../helpers/src/decorators/plug.decorator";
import { stripHtmlValidation } from "../../../../helpers/src/utils/strip.html.validation";
export class ThreadsProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'threads';
        this.name = 'Threads';
        this.isBetweenSteps = false;
        this.scopes = [
            'threads_basic',
            'threads_content_publish',
            'threads_manage_replies',
            'threads_manage_insights',
            // 'threads_profile_discovery',
        ];
        this.maxConcurrentJob = 2; // Threads has moderate rate limits
        this.refreshCron = true;
        this.editor = 'normal';
        // override async mention(
        //   token: string,
        //   data: { query: string },
        //   id: string,
        //   integration: Integration
        // ) {
        //   const p = await (
        //     await fetch(
        //       `https://graph.threads.net/v1.0/profile_lookup?username=${data.query}&access_token=${integration.token}`
        //     )
        //   ).json();
        //
        //   return [
        //     {
        //       id: String(p.id),
        //       label: p.name,
        //       image: p.profile_picture_url,
        //     },
        //   ];
        // }
        //
        // mentionFormat(idOrHandle: string, name: string) {
        //   return `@${idOrHandle}`;
        // }
    }
    maxLength() {
        return 500;
    }
    handleErrors(body) {
        console.log(body);
        if (body.includes('Error validating access token')) {
            return { type: 'refresh-token', value: 'Threads access token expired' };
        }
        if (body.includes('text must be at most 500 characters')) {
            return {
                type: 'bad-body',
                value: 'Post text exceeds 500 characters limit',
            };
        }
        return undefined;
    }
    refreshToken(refresh_token) {
        return __awaiter(this, void 0, void 0, function* () {
            const { access_token } = yield (yield this.fetch(`https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${refresh_token}`)).json();
            const { id, name, username, picture } = yield this.fetchUserInfo(access_token);
            return {
                id,
                name,
                accessToken: access_token,
                refreshToken: access_token,
                expiresIn: dayjs().add(58, 'days').unix() - dayjs().unix(),
                picture: picture || '',
                username: '',
            };
        });
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const state = makeId(6);
            return {
                url: 'https://www.threads.net/oauth/authorize' +
                    `?client_id=${process.env.THREADS_APP_ID}` +
                    `&redirect_uri=${encodeURIComponent(`${((_a = process === null || process === void 0 ? void 0 : process.env.FRONTEND_URL) === null || _a === void 0 ? void 0 : _a.indexOf('https')) == -1
                        ? `https://redirectmeto.com/${process === null || process === void 0 ? void 0 : process.env.FRONTEND_URL}`
                        : `${process === null || process === void 0 ? void 0 : process.env.FRONTEND_URL}`}/integrations/social/threads`)}` +
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
            const getAccessToken = yield (yield this.fetch('https://graph.threads.net/oauth/access_token' +
                `?client_id=${process.env.THREADS_APP_ID}` +
                `&redirect_uri=${encodeURIComponent(`${((_a = process === null || process === void 0 ? void 0 : process.env.FRONTEND_URL) === null || _a === void 0 ? void 0 : _a.indexOf('https')) == -1
                    ? `https://redirectmeto.com/${process === null || process === void 0 ? void 0 : process.env.FRONTEND_URL}`
                    : `${process === null || process === void 0 ? void 0 : process.env.FRONTEND_URL}`}/integrations/social/threads`)}` +
                `&grant_type=authorization_code` +
                `&client_secret=${process.env.THREADS_APP_SECRET}` +
                `&code=${params.code}`)).json();
            const { access_token } = yield (yield this.fetch('https://graph.threads.net/access_token' +
                '?grant_type=th_exchange_token' +
                `&client_secret=${process.env.THREADS_APP_SECRET}` +
                `&access_token=${getAccessToken.access_token}`)).json();
            const { id, name, username, picture } = yield this.fetchUserInfo(access_token);
            return {
                id,
                name,
                accessToken: access_token,
                refreshToken: access_token,
                expiresIn: dayjs().add(58, 'days').unix() - dayjs().unix(),
                picture: picture || '',
                username: username,
            };
        });
    }
    checkLoaded(mediaContainerId, accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const { status, id, error_message } = yield (yield this.fetch(`https://graph.threads.net/v1.0/${mediaContainerId}?fields=status,error_message&access_token=${accessToken}`)).json();
            if (status === 'ERROR') {
                throw new Error(id);
            }
            if (status === 'FINISHED') {
                yield timer(2000);
                return true;
            }
            yield timer(2200);
            return this.checkLoaded(mediaContainerId, accessToken);
        });
    }
    fetchUserInfo(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const { id, username, threads_profile_picture_url } = yield (yield this.fetch(`https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`)).json();
            return {
                id,
                name: username,
                picture: threads_profile_picture_url || '',
                username,
            };
        });
    }
    createSingleMediaContent(userId_1, accessToken_1, media_1, message_1) {
        return __awaiter(this, arguments, void 0, function* (userId, accessToken, media, message, isCarouselItem = false, replyToId) {
            const mediaType = media.path.indexOf('.mp4') > -1 ? 'video_url' : 'image_url';
            const mediaParams = new URLSearchParams(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (mediaType === 'video_url' ? { video_url: media.path } : {})), (mediaType === 'image_url' ? { image_url: media.path } : {})), (isCarouselItem ? { is_carousel_item: 'true' } : {})), (replyToId ? { reply_to_id: replyToId } : {})), { media_type: mediaType === 'video_url' ? 'VIDEO' : 'IMAGE', text: message, access_token: accessToken }));
            const { id: mediaId } = yield (yield this.fetch(`https://graph.threads.net/v1.0/${userId}/threads?${mediaParams.toString()}`, {
                method: 'POST',
            })).json();
            return mediaId;
        });
    }
    createCarouselContent(userId, accessToken, media, message, replyToId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Create each media item
            const mediaIds = [];
            for (const mediaItem of media) {
                const mediaId = yield this.createSingleMediaContent(userId, accessToken, mediaItem, message, true);
                mediaIds.push(mediaId);
            }
            // Wait for all media to be loaded
            yield Promise.all(mediaIds.map((id) => this.checkLoaded(id, accessToken)));
            // Create carousel container
            const params = new URLSearchParams(Object.assign(Object.assign({ text: message, media_type: 'CAROUSEL', children: mediaIds.join(',') }, (replyToId ? { reply_to_id: replyToId } : {})), { access_token: accessToken }));
            const { id: containerId } = yield (yield this.fetch(`https://graph.threads.net/v1.0/${userId}/threads?${params.toString()}`, {
                method: 'POST',
            })).json();
            return containerId;
        });
    }
    createTextContent(userId, accessToken, message, replyToId, quoteId) {
        return __awaiter(this, void 0, void 0, function* () {
            const form = new FormData();
            form.append('media_type', 'TEXT');
            form.append('text', message);
            form.append('access_token', accessToken);
            if (replyToId) {
                form.append('reply_to_id', replyToId);
            }
            if (quoteId) {
                form.append('quote_post_id', quoteId);
            }
            const _a = yield (yield this.fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
                method: 'POST',
                body: form,
            })).json(), { id: contentId } = _a, all = __rest(_a, ["id"]);
            return contentId;
        });
    }
    publishThread(userId, accessToken, creationId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.checkLoaded(creationId, accessToken);
            const { id: threadId } = yield (yield this.fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish?creation_id=${creationId}&access_token=${accessToken}`, {
                method: 'POST',
            })).json();
            const { permalink } = yield (yield this.fetch(`https://graph.threads.net/v1.0/${threadId}?fields=id,permalink&access_token=${accessToken}`)).json();
            return { threadId, permalink };
        });
    }
    createThreadContent(userId, accessToken, postDetails, replyToId, quoteId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Handle content creation based on media type
            if (!postDetails.media || postDetails.media.length === 0) {
                // Text-only content
                return yield this.createTextContent(userId, accessToken, postDetails.message, replyToId, quoteId);
            }
            else if (postDetails.media.length === 1) {
                // Single media content
                return yield this.createSingleMediaContent(userId, accessToken, postDetails.media[0], postDetails.message, false, replyToId);
            }
            else {
                // Carousel content
                return yield this.createCarouselContent(userId, accessToken, postDetails.media, postDetails.message, replyToId);
            }
        });
    }
    post(userId, accessToken, postDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!postDetails.length) {
                return [];
            }
            const [firstPost] = postDetails;
            // Create the initial thread
            const initialContentId = yield this.createThreadContent(userId, accessToken, firstPost);
            // Publish the thread
            const { threadId, permalink } = yield this.publishThread(userId, accessToken, initialContentId);
            // Return the main post response
            return [
                {
                    id: firstPost.id,
                    postId: threadId,
                    status: 'success',
                    releaseURL: permalink,
                },
            ];
        });
    }
    comment(userId, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!postDetails.length) {
                return [];
            }
            const [commentPost] = postDetails;
            const replyToId = lastCommentId || postId;
            // Create reply content
            const replyContentId = yield this.createThreadContent(userId, accessToken, commentPost, replyToId);
            // Publish the reply
            const { threadId: replyThreadId, permalink } = yield this.publishThread(userId, accessToken, replyContentId);
            return [
                {
                    id: commentPost.id,
                    postId: replyThreadId,
                    status: 'success',
                    releaseURL: permalink,
                },
            ];
        });
    }
    analytics(id, accessToken, date) {
        return __awaiter(this, void 0, void 0, function* () {
            const until = dayjs().endOf('day').unix();
            const since = dayjs().subtract(date, 'day').unix();
            const _a = yield (yield fetch(`https://graph.threads.net/v1.0/${id}/threads_insights?metric=views,likes,replies,reposts,quotes&access_token=${accessToken}&period=day&since=${since}&until=${until}`)).json(), { data } = _a, all = __rest(_a, ["data"]);
            return ((data === null || data === void 0 ? void 0 : data.map((d) => ({
                label: capitalize(d.name),
                percentageChange: 5,
                data: d.total_value
                    ? [{ total: d.total_value.value, date: dayjs().format('YYYY-MM-DD') }]
                    : d.values.map((v) => ({
                        total: v.value,
                        date: dayjs(v.end_time).format('YYYY-MM-DD'),
                    })),
            }))) || []);
        });
    }
    autoPlugPost(integration, id, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield (yield fetch(`https://graph.threads.net/v1.0/${id}/insights?metric=likes&access_token=${integration.token}`)).json();
            const { values: [value], } = data.find((p) => p.name === 'likes');
            if (value.value >= fields.likesAmount) {
                yield timer(2000);
                const form = new FormData();
                form.append('media_type', 'TEXT');
                form.append('text', stripHtmlValidation('normal', fields.post, true));
                form.append('reply_to_id', id);
                form.append('access_token', integration.token);
                const { id: replyId } = yield (yield this.fetch('https://graph.threads.net/v1.0/me/threads', {
                    method: 'POST',
                    body: form,
                })).json();
                yield (yield this.fetch(`https://graph.threads.net/v1.0/${integration.internalId}/threads_publish?creation_id=${replyId}&access_token=${integration.token}`, {
                    method: 'POST',
                })).json();
                return true;
            }
            return false;
        });
    }
    postAnalytics(integrationId, accessToken, postId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const today = dayjs().format('YYYY-MM-DD');
            try {
                // Fetch thread insights from Threads API
                const { data } = yield (yield this.fetch(`https://graph.threads.net/v1.0/${postId}/insights?metric=views,likes,replies,reposts,quotes&access_token=${accessToken}`)).json();
                if (!data || data.length === 0) {
                    return [];
                }
                const result = [];
                for (const metric of data) {
                    const value = (_c = (_b = (_a = metric.values) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value) !== null && _c !== void 0 ? _c : (_d = metric.total_value) === null || _d === void 0 ? void 0 : _d.value;
                    if (value === undefined)
                        continue;
                    let label = '';
                    switch (metric.name) {
                        case 'views':
                            label = 'Views';
                            break;
                        case 'likes':
                            label = 'Likes';
                            break;
                        case 'replies':
                            label = 'Replies';
                            break;
                        case 'reposts':
                            label = 'Reposts';
                            break;
                        case 'quotes':
                            label = 'Quotes';
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
                console.error('Error fetching Threads post analytics:', err);
                return [];
            }
        });
    }
}
__decorate([
    Plug({
        identifier: 'threads-autoPlugPost',
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
], ThreadsProvider.prototype, "autoPlugPost", null);
//# sourceMappingURL=threads.provider.js.map