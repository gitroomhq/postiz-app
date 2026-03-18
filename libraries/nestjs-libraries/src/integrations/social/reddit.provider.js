import { __awaiter, __decorate, __metadata, __rest } from "tslib";
import { makeId } from "../../services/make.is";
import { RedditSettingsDto } from "../../dtos/posts/providers-settings/reddit.dto";
import { timer } from "../../../../helpers/src/utils/timer";
import { groupBy } from 'lodash';
import { SocialAbstract } from "../social.abstract";
import { lookup } from 'mime-types';
import axios from 'axios';
import WebSocket from 'ws';
import { Tool } from "../tool.decorator";
// @ts-ignore
global.WebSocket = WebSocket;
export class RedditProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 1; // Reddit has strict rate limits (1 request per second)
        this.identifier = 'reddit';
        this.name = 'Reddit';
        this.isBetweenSteps = false;
        this.scopes = ['read', 'identity', 'submit', 'flair'];
        this.editor = 'normal';
        this.dto = RedditSettingsDto;
    }
    maxLength() {
        return 10000;
    }
    refreshToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { access_token: accessToken, expires_in: expiresIn } = yield (yield this.fetch('https://www.reddit.com/api/v1/access_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64')}`,
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                }),
            })).json();
            const { name, id, icon_img } = yield (yield this.fetch('https://oauth.reddit.com/api/v1/me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })).json();
            return {
                id,
                name,
                accessToken,
                refreshToken: refreshToken,
                expiresIn,
                picture: ((_b = (_a = icon_img === null || icon_img === void 0 ? void 0 : icon_img.split) === null || _a === void 0 ? void 0 : _a.call(icon_img, '?')) === null || _b === void 0 ? void 0 : _b[0]) || '',
                username: name,
            };
        });
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            const state = makeId(6);
            const codeVerifier = makeId(30);
            const url = `https://www.reddit.com/api/v1/authorize?client_id=${process.env.REDDIT_CLIENT_ID}&response_type=code&state=${state}&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/reddit`)}&duration=permanent&scope=${encodeURIComponent(this.scopes.join(' '))}`;
            return {
                url,
                codeVerifier,
                state,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn, scope, } = yield (yield this.fetch('https://www.reddit.com/api/v1/access_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64')}`,
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: params.code,
                    redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/reddit`,
                }),
            })).json();
            this.checkScopes(this.scopes, scope);
            const { name, id, icon_img } = yield (yield this.fetch('https://oauth.reddit.com/api/v1/me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })).json();
            return {
                id,
                name,
                accessToken,
                refreshToken,
                expiresIn,
                picture: ((_b = (_a = icon_img === null || icon_img === void 0 ? void 0 : icon_img.split) === null || _a === void 0 ? void 0 : _a.call(icon_img, '?')) === null || _b === void 0 ? void 0 : _b[0]) || '',
                username: name,
            };
        });
    }
    uploadFileToReddit(accessToken, path) {
        return __awaiter(this, void 0, void 0, function* () {
            const mimeType = lookup(path);
            const formData = new FormData();
            formData.append('filepath', path.split('/').pop());
            formData.append('mimetype', mimeType || 'application/octet-stream');
            const { args: { action, fields }, } = yield (yield this.fetch('https://oauth.reddit.com/api/media/asset', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: formData,
            }, 'reddit', 0, true)).json();
            const { data } = yield axios.get(path, {
                responseType: 'arraybuffer',
            });
            const upload = fields.reduce((acc, value) => {
                acc.append(value.name, value.value);
                return acc;
            }, new FormData());
            upload.append('file', new Blob([Buffer.from(data)], { type: mimeType }));
            const d = yield fetch('https:' + action, {
                method: 'POST',
                body: upload,
            });
            return [...(yield d.text()).matchAll(/<Location>(.*?)<\/Location>/g)][0][1];
        });
    }
    post(id, accessToken, postDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            const [post] = postDetails;
            const valueArray = [];
            for (const firstPostSettings of post.settings.subreddit) {
                const postData = Object.assign(Object.assign(Object.assign(Object.assign({ api_type: 'json', title: firstPostSettings.value.title || '', kind: firstPostSettings.value.type === 'media'
                        ? post.media[0].path.indexOf('mp4') > -1
                            ? 'video'
                            : 'image'
                        : firstPostSettings.value.type }, (firstPostSettings.value.flair
                    ? { flair_id: firstPostSettings.value.flair.id }
                    : {})), (firstPostSettings.value.type === 'link'
                    ? {
                        url: firstPostSettings.value.url,
                    }
                    : {})), (firstPostSettings.value.type === 'media'
                    ? Object.assign({ url: yield this.uploadFileToReddit(accessToken, post.media[0].path) }, (post.media[0].path.indexOf('mp4') > -1
                        ? {
                            video_poster_url: yield this.uploadFileToReddit(accessToken, post.media[0].thumbnail),
                        }
                        : {})) : {})), { text: post.message, sr: firstPostSettings.value.subreddit.indexOf('/r/') > -1
                        ? firstPostSettings.value.subreddit
                        : `/r/${firstPostSettings.value.subreddit}` });
                const all = yield (yield this.fetch('https://oauth.reddit.com/api/submit', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams(postData),
                })).json();
                const { id: redditId, name, url, } = yield new Promise((res) => {
                    var _a, _b;
                    if ((_b = (_a = all === null || all === void 0 ? void 0 : all.json) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.id) {
                        res(all.json.data);
                    }
                    const ws = new WebSocket(all.json.data.websocket_url);
                    ws.on('message', (data) => {
                        var _a, _b, _c;
                        setTimeout(() => {
                            res({ id: '', name: '', url: '' });
                            ws.close();
                        }, 30000);
                        try {
                            const parsedData = JSON.parse(data.toString());
                            if ((_a = parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) === null || _a === void 0 ? void 0 : _a.redirect) {
                                const onlyId = (_b = parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) === null || _b === void 0 ? void 0 : _b.redirect.replace(/https:\/\/www\.reddit\.com\/r\/.*?\/comments\/(.*?)\/.*/g, '$1');
                                res({
                                    id: onlyId,
                                    name: `t3_${onlyId}`,
                                    url: (_c = parsedData === null || parsedData === void 0 ? void 0 : parsedData.payload) === null || _c === void 0 ? void 0 : _c.redirect,
                                });
                            }
                        }
                        catch (err) { }
                    });
                });
                valueArray.push({
                    postId: redditId,
                    releaseURL: url,
                    id: post.id,
                    status: 'published',
                });
                if (post.settings.subreddit.length > 1) {
                    yield timer(5000);
                }
            }
            return Object.values(groupBy(valueArray, (p) => p.id)).map((p) => ({
                id: p[0].id,
                postId: p.map((p) => p.postId).join(','),
                releaseURL: p.map((p) => p.releaseURL).join(','),
                status: 'published',
            }));
        });
    }
    comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const [commentPost] = postDetails;
            // Reddit uses thing_id format like t3_xxx for posts
            const thingId = postId.startsWith('t3_') ? postId : `t3_${postId}`;
            const { json: { data: { things: [{ data: { id: commentId, permalink }, },], }, }, } = yield (yield this.fetch('https://oauth.reddit.com/api/comment', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    text: commentPost.message,
                    thing_id: thingId,
                    api_type: 'json',
                }),
            })).json();
            return [
                {
                    postId: commentId,
                    releaseURL: 'https://www.reddit.com' + permalink,
                    id: commentPost.id,
                    status: 'published',
                },
            ];
        });
    }
    subreddits(accessToken, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: { children }, } = yield (yield this.fetch(`https://oauth.reddit.com/subreddits/search?show=public&q=${data.word}&sort=activity&show_users=false&limit=10`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }, 'reddit', 0, false)).json();
            return children
                .filter(({ data }) => data.subreddit_type === 'public' && data.submission_type !== 'image')
                .map(({ data: { title, url, id } }) => ({
                title,
                name: url,
                id,
            }));
        });
    }
    getPermissions(submissionType, allow_images) {
        const permissions = [];
        if (['any', 'self'].indexOf(submissionType) > -1) {
            permissions.push('self');
        }
        if (['any', 'link'].indexOf(submissionType) > -1) {
            permissions.push('link');
        }
        if (allow_images) {
            permissions.push('media');
        }
        return permissions;
    }
    restrictions(accessToken, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const _b = (yield (yield this.fetch(`https://oauth.reddit.com/${data.subreddit}/about`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }, 'reddit', 0, false)).json()).data, { submission_type, allow_images } = _b, all2 = __rest(_b, ["submission_type", "allow_images"]);
            const _c = yield (yield this.fetch(`https://oauth.reddit.com/api/v1/${data.subreddit.split('/r/')[1]}/post_requirements`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }, 'reddit', 0, false)).json(), { is_flair_required } = _c, all = __rest(_c, ["is_flair_required"]);
            // eslint-disable-next-line no-async-promise-executor
            const newData = yield new Promise((res) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const flair = yield (yield this.fetch(`https://oauth.reddit.com/${data.subreddit}/api/link_flair_v2`, {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                    }, 'reddit', 0, false)).json();
                    res(flair);
                }
                catch (err) {
                    return res([]);
                }
            }));
            return {
                subreddit: data.subreddit,
                allow: this.getPermissions(submission_type, allow_images),
                is_flair_required: is_flair_required && newData.length > 0,
                flairs: ((_a = newData === null || newData === void 0 ? void 0 : newData.map) === null || _a === void 0 ? void 0 : _a.call(newData, (p) => ({
                    id: p.id,
                    name: p.text,
                }))) || [],
            };
        });
    }
}
__decorate([
    Tool({
        description: 'Get list of subreddits with information',
        dataSchema: [
            {
                key: 'word',
                type: 'string',
                description: 'Search subreddit by string',
            },
        ],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RedditProvider.prototype, "subreddits", null);
__decorate([
    Tool({
        description: 'Get list of flairs and restrictions for a subreddit',
        dataSchema: [
            {
                key: 'subreddit',
                type: 'string',
                description: 'Search flairs and restrictions by subreddit key should be "/r/[name]"',
            },
        ],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RedditProvider.prototype, "restrictions", null);
//# sourceMappingURL=reddit.provider.js.map