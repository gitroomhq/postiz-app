import { __awaiter, __decorate, __metadata } from "tslib";
import { TwitterApi } from 'twitter-api-v2';
import { lookup } from 'mime-types';
import sharp from 'sharp';
import { readOrFetch } from "../../../../helpers/src/utils/read.or.fetch";
import { SocialAbstract } from "../social.abstract";
import { Plug } from "../../../../helpers/src/decorators/plug.decorator";
import { timer } from "../../../../helpers/src/utils/timer";
import { PostPlug } from "../../../../helpers/src/decorators/post.plug";
import dayjs from 'dayjs';
import { uniqBy } from 'lodash';
import { stripHtmlValidation } from "../../../../helpers/src/utils/strip.html.validation";
import { XDto } from "../../dtos/posts/providers-settings/x.dto";
import { Rules } from "../../chat/rules.description.decorator";
let XProvider = class XProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'x';
        this.name = 'X';
        this.isBetweenSteps = false;
        this.scopes = [];
        this.maxConcurrentJob = 1; // X has strict rate limits (300 posts per 3 hours)
        this.toolTip = 'You will be logged in into your current account, if you would like a different account, change it first on X';
        this.editor = 'normal';
        this.dto = XDto;
        this.loadAllTweets = (client_1, id_1, until_1, since_1, ...args_1) => __awaiter(this, [client_1, id_1, until_1, since_1, ...args_1], void 0, function* (client, id, until, since, token = '') {
            const tweets = yield client.v2.userTimeline(id, Object.assign({ 'tweet.fields': ['id'], 'user.fields': [], 'poll.fields': [], 'place.fields': [], 'media.fields': [], exclude: ['replies', 'retweets'], start_time: since, end_time: until, max_results: 100 }, (token ? { pagination_token: token } : {})));
            return [
                ...tweets.data.data,
                ...(tweets.data.data.length === 100
                    ? yield this.loadAllTweets(client, id, until, since, tweets.meta.next_token)
                    : []),
            ];
        });
    }
    maxLength(isTwitterPremium) {
        return isTwitterPremium ? 4000 : 200;
    }
    handleErrors(body) {
        if (body.includes('Unsupported Authentication')) {
            return {
                type: 'refresh-token',
                value: 'X authentication has expired, please reconnect your account',
            };
        }
        if (body.includes('usage-capped')) {
            return {
                type: 'bad-body',
                value: 'Posting failed - capped reached. Please try again later',
            };
        }
        if (body.includes('duplicate-rules')) {
            return {
                type: 'bad-body',
                value: 'You have already posted this post, please wait before posting again',
            };
        }
        if (body.includes('The Tweet contains an invalid URL.')) {
            return {
                type: 'bad-body',
                value: 'The Tweet contains a URL that is not allowed on X',
            };
        }
        if (body.includes('This user is not allowed to post a video longer than 2 minutes')) {
            return {
                type: 'bad-body',
                value: 'The video you are trying to post is longer than 2 minutes, which is not allowed for this account',
            };
        }
        return undefined;
    }
    autoRepostPost(integration, id, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            // @ts-ignore
            // eslint-disable-next-line prefer-rest-params
            const [accessTokenSplit, accessSecretSplit] = integration.token.split(':');
            const client = new TwitterApi({
                appKey: process.env.X_API_KEY,
                appSecret: process.env.X_API_SECRET,
                accessToken: accessTokenSplit,
                accessSecret: accessSecretSplit,
            });
            if ((yield client.v2.tweetLikedBy(id)).meta.result_count >=
                +fields.likesAmount) {
                yield timer(2000);
                yield client.v2.retweet(integration.internalId, id);
                return true;
            }
            return false;
        });
    }
    repostPostUsers(integration, originalIntegration, postId, information) {
        return __awaiter(this, void 0, void 0, function* () {
            const [accessTokenSplit, accessSecretSplit] = integration.token.split(':');
            const client = new TwitterApi({
                appKey: process.env.X_API_KEY,
                appSecret: process.env.X_API_SECRET,
                accessToken: accessTokenSplit,
                accessSecret: accessSecretSplit,
            });
            const { data: { id }, } = yield client.v2.me();
            try {
                yield client.v2.retweet(id, postId);
            }
            catch (err) {
                /** nothing **/
            }
        });
    }
    autoPlugPost(integration, id, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            // @ts-ignore
            // eslint-disable-next-line prefer-rest-params
            const [accessTokenSplit, accessSecretSplit] = integration.token.split(':');
            const client = new TwitterApi({
                appKey: process.env.X_API_KEY,
                appSecret: process.env.X_API_SECRET,
                accessToken: accessTokenSplit,
                accessSecret: accessSecretSplit,
            });
            if ((yield client.v2.tweetLikedBy(id)).meta.result_count >=
                +fields.likesAmount) {
                yield timer(2000);
                yield client.v2.tweet({
                    text: stripHtmlValidation('normal', fields.post, true),
                    reply: { in_reply_to_tweet_id: id },
                });
                return true;
            }
            return false;
        });
    }
    refreshToken() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                id: '',
                name: '',
                accessToken: '',
                refreshToken: '',
                expiresIn: 0,
                picture: '',
                username: '',
            };
        });
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            const client = new TwitterApi({
                appKey: process.env.X_API_KEY,
                appSecret: process.env.X_API_SECRET,
            });
            const { url, oauth_token, oauth_token_secret } = yield client.generateAuthLink((process.env.X_URL || process.env.FRONTEND_URL) +
                `/integrations/social/x`, {
                authAccessType: 'write',
                linkMode: 'authenticate',
                forceLogin: false,
            });
            return {
                url,
                codeVerifier: oauth_token + ':' + oauth_token_secret,
                state: oauth_token,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { code, codeVerifier } = params;
            const [oauth_token, oauth_token_secret] = codeVerifier.split(':');
            const startingClient = new TwitterApi({
                appKey: process.env.X_API_KEY,
                appSecret: process.env.X_API_SECRET,
                accessToken: oauth_token,
                accessSecret: oauth_token_secret,
            });
            const { accessToken, client, accessSecret } = yield startingClient.login(code);
            const { data: { username, verified, profile_image_url, name, id }, } = yield client.v2.me({
                'user.fields': [
                    'username',
                    'verified',
                    'verified_type',
                    'profile_image_url',
                    'name',
                ],
            });
            return {
                id: String(id),
                accessToken: accessToken + ':' + accessSecret,
                name,
                refreshToken: '',
                expiresIn: 999999999,
                picture: profile_image_url || '',
                username,
                additionalSettings: [
                    {
                        title: 'Verified',
                        description: 'Is this a verified user? (Premium)',
                        type: 'checkbox',
                        value: verified,
                    },
                ],
            };
        });
    }
    getClient(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const [accessTokenSplit, accessSecretSplit] = accessToken.split(':');
            return new TwitterApi({
                appKey: process.env.X_API_KEY,
                appSecret: process.env.X_API_SECRET,
                accessToken: accessTokenSplit,
                accessSecret: accessSecretSplit,
            });
        });
    }
    uploadMedia(client, postDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield Promise.all(postDetails.flatMap((p) => {
                var _a;
                return (_a = p === null || p === void 0 ? void 0 : p.media) === null || _a === void 0 ? void 0 : _a.flatMap((m) => __awaiter(this, void 0, void 0, function* () {
                    return {
                        id: yield this.runInConcurrent(() => __awaiter(this, void 0, void 0, function* () {
                            return client.v2.uploadMedia(m.path.indexOf('mp4') > -1
                                ? Buffer.from(yield readOrFetch(m.path))
                                : yield sharp(yield readOrFetch(m.path), {
                                    animated: lookup(m.path) === 'image/gif',
                                })
                                    .resize({
                                    width: 1000,
                                })
                                    .gif()
                                    .toBuffer(), {
                                media_type: (lookup(m.path) || ''),
                            });
                        }), true),
                        postId: p.id,
                    };
                }));
            }))).reduce((acc, val) => {
                if (!(val === null || val === void 0 ? void 0 : val.id)) {
                    return acc;
                }
                acc[val.postId] = acc[val.postId] || [];
                acc[val.postId].push(val.id);
                return acc;
            }, {});
        });
    }
    post(id, accessToken, postDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.getClient(accessToken);
            const { data: { username }, } = yield this.runInConcurrent(() => __awaiter(this, void 0, void 0, function* () {
                return client.v2.me({
                    'user.fields': 'username',
                });
            }));
            const [firstPost] = postDetails;
            // upload media for the first post
            const uploadAll = yield this.uploadMedia(client, [firstPost]);
            const media_ids = (uploadAll[firstPost.id] || []).filter((f) => f);
            // @ts-ignore
            const { data } = yield this.runInConcurrent(() => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d, _e, _f;
                // @ts-ignore
                return client.v2.tweet(Object.assign(Object.assign(Object.assign(Object.assign({}, (!((_a = firstPost === null || firstPost === void 0 ? void 0 : firstPost.settings) === null || _a === void 0 ? void 0 : _a.who_can_reply_post) ||
                    ((_b = firstPost === null || firstPost === void 0 ? void 0 : firstPost.settings) === null || _b === void 0 ? void 0 : _b.who_can_reply_post) === 'everyone'
                    ? {}
                    : {
                        reply_settings: (_c = firstPost === null || firstPost === void 0 ? void 0 : firstPost.settings) === null || _c === void 0 ? void 0 : _c.who_can_reply_post,
                    })), (((_d = firstPost === null || firstPost === void 0 ? void 0 : firstPost.settings) === null || _d === void 0 ? void 0 : _d.community)
                    ? {
                        share_with_followers: true,
                        community_id: ((_f = (_e = firstPost === null || firstPost === void 0 ? void 0 : firstPost.settings) === null || _e === void 0 ? void 0 : _e.community) === null || _f === void 0 ? void 0 : _f.split('/').pop()) || '',
                    }
                    : {})), { text: firstPost.message }), (media_ids.length ? { media: { media_ids } } : {})));
            }));
            return [
                {
                    postId: data.id,
                    id: firstPost.id,
                    releaseURL: `https://twitter.com/${username}/status/${data.id}`,
                    status: 'posted',
                },
            ];
        });
    }
    comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.getClient(accessToken);
            const { data: { username }, } = yield this.runInConcurrent(() => __awaiter(this, void 0, void 0, function* () {
                return client.v2.me({
                    'user.fields': 'username',
                });
            }));
            const [commentPost] = postDetails;
            // upload media for the comment
            const uploadAll = yield this.uploadMedia(client, [commentPost]);
            const media_ids = (uploadAll[commentPost.id] || []).filter((f) => f);
            const replyToId = lastCommentId || postId;
            // @ts-ignore
            const { data } = yield this.runInConcurrent(() => __awaiter(this, void 0, void 0, function* () {
                // @ts-ignore
                return client.v2.tweet(Object.assign(Object.assign({ text: commentPost.message }, (media_ids.length ? { media: { media_ids } } : {})), { reply: { in_reply_to_tweet_id: replyToId } }));
            }));
            return [
                {
                    postId: data.id,
                    id: commentPost.id,
                    releaseURL: `https://twitter.com/${username}/status/${data.id}`,
                    status: 'posted',
                },
            ];
        });
    }
    analytics(id, accessToken, date) {
        return __awaiter(this, void 0, void 0, function* () {
            if (process.env.DISABLE_X_ANALYTICS) {
                return [];
            }
            const until = dayjs().endOf('day');
            const since = dayjs().subtract(date > 100 ? 100 : date, 'day');
            const [accessTokenSplit, accessSecretSplit] = accessToken.split(':');
            const client = new TwitterApi({
                appKey: process.env.X_API_KEY,
                appSecret: process.env.X_API_SECRET,
                accessToken: accessTokenSplit,
                accessSecret: accessSecretSplit,
            });
            try {
                const tweets = uniqBy(yield this.loadAllTweets(client, id, until.format('YYYY-MM-DDTHH:mm:ssZ'), since.format('YYYY-MM-DDTHH:mm:ssZ')), (p) => p.id);
                if (tweets.length === 0) {
                    return [];
                }
                const data = yield client.v2.tweets(tweets.map((p) => p.id), {
                    'tweet.fields': ['public_metrics'],
                });
                const metrics = data.data.reduce((all, current) => {
                    all.impression_count =
                        (all.impression_count || 0) +
                            +current.public_metrics.impression_count;
                    all.bookmark_count =
                        (all.bookmark_count || 0) + +current.public_metrics.bookmark_count;
                    all.like_count =
                        (all.like_count || 0) + +current.public_metrics.like_count;
                    all.quote_count =
                        (all.quote_count || 0) + +current.public_metrics.quote_count;
                    all.reply_count =
                        (all.reply_count || 0) + +current.public_metrics.reply_count;
                    all.retweet_count =
                        (all.retweet_count || 0) + +current.public_metrics.retweet_count;
                    return all;
                }, {
                    impression_count: 0,
                    bookmark_count: 0,
                    like_count: 0,
                    quote_count: 0,
                    reply_count: 0,
                    retweet_count: 0,
                });
                return Object.entries(metrics).map(([key, value]) => ({
                    label: key.replace('_count', '').replace('_', ' ').toUpperCase(),
                    percentageChange: 5,
                    data: [
                        {
                            total: String(0),
                            date: since.format('YYYY-MM-DD'),
                        },
                        {
                            total: String(value),
                            date: until.format('YYYY-MM-DD'),
                        },
                    ],
                }));
            }
            catch (err) {
                console.log(err);
            }
            return [];
        });
    }
    postAnalytics(integrationId, accessToken, postId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (process.env.DISABLE_X_ANALYTICS) {
                return [];
            }
            const today = dayjs().format('YYYY-MM-DD');
            const [accessTokenSplit, accessSecretSplit] = accessToken.split(':');
            const client = new TwitterApi({
                appKey: process.env.X_API_KEY,
                appSecret: process.env.X_API_SECRET,
                accessToken: accessTokenSplit,
                accessSecret: accessSecretSplit,
            });
            try {
                // Fetch the specific tweet with public metrics
                const tweet = yield client.v2.singleTweet(postId, {
                    'tweet.fields': ['public_metrics', 'created_at'],
                });
                if (!((_a = tweet === null || tweet === void 0 ? void 0 : tweet.data) === null || _a === void 0 ? void 0 : _a.public_metrics)) {
                    return [];
                }
                const metrics = tweet.data.public_metrics;
                const result = [];
                if (metrics.impression_count !== undefined) {
                    result.push({
                        label: 'Impressions',
                        percentageChange: 0,
                        data: [{ total: String(metrics.impression_count), date: today }],
                    });
                }
                if (metrics.like_count !== undefined) {
                    result.push({
                        label: 'Likes',
                        percentageChange: 0,
                        data: [{ total: String(metrics.like_count), date: today }],
                    });
                }
                if (metrics.retweet_count !== undefined) {
                    result.push({
                        label: 'Retweets',
                        percentageChange: 0,
                        data: [{ total: String(metrics.retweet_count), date: today }],
                    });
                }
                if (metrics.reply_count !== undefined) {
                    result.push({
                        label: 'Replies',
                        percentageChange: 0,
                        data: [{ total: String(metrics.reply_count), date: today }],
                    });
                }
                if (metrics.quote_count !== undefined) {
                    result.push({
                        label: 'Quotes',
                        percentageChange: 0,
                        data: [{ total: String(metrics.quote_count), date: today }],
                    });
                }
                if (metrics.bookmark_count !== undefined) {
                    result.push({
                        label: 'Bookmarks',
                        percentageChange: 0,
                        data: [{ total: String(metrics.bookmark_count), date: today }],
                    });
                }
                return result;
            }
            catch (err) {
                console.log('Error fetching X post analytics:', err);
            }
            return [];
        });
    }
    mention(token, d) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const [accessTokenSplit, accessSecretSplit] = token.split(':');
            const client = new TwitterApi({
                appKey: process.env.X_API_KEY,
                appSecret: process.env.X_API_SECRET,
                accessToken: accessTokenSplit,
                accessSecret: accessSecretSplit,
            });
            try {
                const data = yield client.v2.userByUsername(d.query, {
                    'user.fields': ['username', 'name', 'profile_image_url'],
                });
                if (!((_a = data === null || data === void 0 ? void 0 : data.data) === null || _a === void 0 ? void 0 : _a.username)) {
                    return [];
                }
                return [
                    {
                        id: data.data.username,
                        image: data.data.profile_image_url,
                        label: data.data.name,
                    },
                ];
            }
            catch (err) {
                console.log(err);
            }
            return [];
        });
    }
    mentionFormat(idOrHandle, name) {
        return `@${idOrHandle}`;
    }
};
__decorate([
    Plug({
        identifier: 'x-autoRepostPost',
        title: 'Auto Repost Posts',
        disabled: !!process.env.DISABLE_X_ANALYTICS,
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
], XProvider.prototype, "autoRepostPost", null);
__decorate([
    PostPlug({
        identifier: 'x-repost-post-users',
        title: 'Add Re-posters',
        description: 'Add accounts to repost your post',
        pickIntegration: ['x'],
        fields: [],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, Object]),
    __metadata("design:returntype", Promise)
], XProvider.prototype, "repostPostUsers", null);
__decorate([
    Plug({
        identifier: 'x-autoPlugPost',
        title: 'Auto plug post',
        disabled: !!process.env.DISABLE_X_ANALYTICS,
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
], XProvider.prototype, "autoPlugPost", null);
XProvider = __decorate([
    Rules('X can have maximum 4 pictures, or maximum one video, it can also be without attachments')
], XProvider);
export { XProvider };
//# sourceMappingURL=x.provider.js.map