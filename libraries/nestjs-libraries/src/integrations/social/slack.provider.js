import { __awaiter, __decorate, __metadata } from "tslib";
import { makeId } from "../../services/make.is";
import { SocialAbstract } from "../social.abstract";
import dayjs from 'dayjs';
import { SlackDto } from "../../dtos/posts/providers-settings/slack.dto";
import { Tool } from "../tool.decorator";
export class SlackProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 3; // Slack has moderate API limits
        this.identifier = 'slack';
        this.name = 'Slack';
        this.isBetweenSteps = false;
        this.editor = 'normal';
        this.scopes = [
            'channels:read',
            'chat:write',
            'users:read',
            'groups:read',
            'channels:join',
            'chat:write.customize',
        ];
        this.dto = SlackDto;
    }
    maxLength() {
        return 400000;
    }
    refreshToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                refreshToken: '',
                expiresIn: 1000000,
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
            var _a, _b, _c;
            const state = makeId(6);
            return {
                url: `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_ID}&redirect_uri=${encodeURIComponent(`${((_b = (_a = process === null || process === void 0 ? void 0 : process.env) === null || _a === void 0 ? void 0 : _a.FRONTEND_URL) === null || _b === void 0 ? void 0 : _b.indexOf('https')) === -1
                    ? 'https://redirectmeto.com/'
                    : ''}${(_c = process === null || process === void 0 ? void 0 : process.env) === null || _c === void 0 ? void 0 : _c.FRONTEND_URL}/integrations/social/slack`)}&scope=channels:read,chat:write,users:read,groups:read,channels:join,chat:write.customize&state=${state}`,
                codeVerifier: makeId(10),
                state,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const { access_token, team, bot_user_id, scope } = yield (yield this.fetch(`https://slack.com/api/oauth.v2.access`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: process.env.SLACK_ID,
                    client_secret: process.env.SLACK_SECRET,
                    code: params.code,
                    redirect_uri: `${((_b = (_a = process === null || process === void 0 ? void 0 : process.env) === null || _a === void 0 ? void 0 : _a.FRONTEND_URL) === null || _b === void 0 ? void 0 : _b.indexOf('https')) === -1
                        ? 'https://redirectmeto.com/'
                        : ''}${(_c = process === null || process === void 0 ? void 0 : process.env) === null || _c === void 0 ? void 0 : _c.FRONTEND_URL}/integrations/social/slack${params.refresh ? `?refresh=${params.refresh}` : ''}`,
                }),
            })).json();
            this.checkScopes(this.scopes, scope.split(','));
            const { user } = yield (yield fetch(`https://slack.com/api/users.info?user=${bot_user_id}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            })).json();
            return {
                id: team.id,
                name: user.real_name,
                accessToken: access_token,
                refreshToken: 'null',
                expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
                picture: ((_d = user === null || user === void 0 ? void 0 : user.profile) === null || _d === void 0 ? void 0 : _d.image_original) || '',
                username: user.name,
            };
        });
    }
    channels(accessToken, params, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const list = yield (yield fetch(`https://slack.com/api/conversations.list?types=public_channel,private_channel`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })).json();
            return list.channels.map((p) => ({
                id: p.id,
                name: p.name,
            }));
        });
    }
    post(id, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const [firstPost] = postDetails;
            const channel = firstPost.settings.channel;
            // Join the channel first
            yield fetch(`https://slack.com/api/conversations.join`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    channel,
                }),
            });
            // Post the main message
            const { ts, channel: responseChannel } = yield (yield fetch(`https://slack.com/api/chat.postMessage`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    channel,
                    username: integration.name,
                    icon_url: integration.picture,
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: firstPost.message,
                            },
                        },
                        ...(((_a = firstPost.media) === null || _a === void 0 ? void 0 : _a.length)
                            ? firstPost.media.map((m) => ({
                                type: 'image',
                                image_url: m.path,
                                alt_text: '',
                            }))
                            : []),
                    ],
                }),
            })).json();
            // Get permalink for the message
            const { permalink } = yield (yield fetch(`https://slack.com/api/chat.getPermalink?channel=${responseChannel}&message_ts=${ts}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })).json();
            return [
                {
                    id: firstPost.id,
                    postId: ts,
                    releaseURL: permalink || '',
                    status: 'posted',
                },
            ];
        });
    }
    comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const [commentPost] = postDetails;
            const channel = commentPost.settings.channel;
            const threadTs = lastCommentId || postId;
            // Post the threaded reply
            const { ts, channel: responseChannel } = yield (yield fetch(`https://slack.com/api/chat.postMessage`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    channel,
                    username: integration.name,
                    icon_url: integration.picture,
                    thread_ts: threadTs,
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: commentPost.message,
                            },
                        },
                        ...(((_a = commentPost.media) === null || _a === void 0 ? void 0 : _a.length)
                            ? commentPost.media.map((m) => ({
                                type: 'image',
                                image_url: m.path,
                                alt_text: '',
                            }))
                            : []),
                    ],
                }),
            })).json();
            // Get permalink for the comment
            const { permalink } = yield (yield fetch(`https://slack.com/api/chat.getPermalink?channel=${responseChannel}&message_ts=${ts}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })).json();
            return [
                {
                    id: commentPost.id,
                    postId: ts,
                    releaseURL: permalink || '',
                    status: 'posted',
                },
            ];
        });
    }
    changeProfilePicture(id, accessToken, url) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                url,
            };
        });
    }
    changeNickname(id, accessToken, name) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                name,
            };
        });
    }
}
__decorate([
    Tool({
        description: 'Get list of channels',
        dataSchema: [],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], SlackProvider.prototype, "channels", null);
//# sourceMappingURL=slack.provider.js.map