import { __awaiter, __decorate, __metadata } from "tslib";
import { makeId } from "../../services/make.is";
import { SocialAbstract } from "../social.abstract";
import { DiscordDto } from "../../dtos/posts/providers-settings/discord.dto";
import { Tool } from "../tool.decorator";
export class DiscordProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 5; // Discord has generous rate limits for webhook posting
        this.identifier = 'discord';
        this.name = 'Discord';
        this.isBetweenSteps = false;
        this.editor = 'markdown';
        this.scopes = ['identify', 'guilds'];
        this.dto = DiscordDto;
    }
    maxLength() {
        return 1980;
    }
    refreshToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const { access_token, expires_in, refresh_token } = yield (yield this.fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                body: new URLSearchParams({
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token',
                }),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${Buffer.from(process.env.DISCORD_CLIENT_ID +
                        ':' +
                        process.env.DISCORD_CLIENT_SECRET).toString('base64')}`,
                },
            })).json();
            const { application } = yield (yield fetch('https://discord.com/api/oauth2/@me', {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            })).json();
            return {
                refreshToken: refresh_token,
                expiresIn: expires_in,
                accessToken: access_token,
                id: '',
                name: application.name,
                picture: '',
                username: '',
            };
        });
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            const state = makeId(6);
            return {
                url: `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=377957124096&response_type=code&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/discord`)}&integration_type=0&scope=bot+identify+guilds&state=${state}`,
                codeVerifier: makeId(10),
                state,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { access_token, expires_in, refresh_token, scope, guild } = yield (yield this.fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                body: new URLSearchParams({
                    code: params.code,
                    grant_type: 'authorization_code',
                    redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/discord`,
                }),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${Buffer.from(process.env.DISCORD_CLIENT_ID +
                        ':' +
                        process.env.DISCORD_CLIENT_SECRET).toString('base64')}`,
                },
            })).json();
            this.checkScopes(this.scopes, scope.split(' '));
            const { application } = yield (yield fetch('https://discord.com/api/oauth2/@me', {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            })).json();
            return {
                id: guild.id,
                name: application.name,
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresIn: expires_in,
                picture: `https://cdn.discordapp.com/avatars/${application.bot.id}/${application.bot.avatar}.png`,
                username: application.bot.username,
            };
        });
    }
    channels(accessToken, params, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const list = yield (yield fetch(`https://discord.com/api/guilds/${id}/channels`, {
                headers: {
                    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_ID}`,
                },
            })).json();
            return list
                .filter((p) => p.type === 0 || p.type === 5 || p.type === 15)
                .map((p) => ({
                id: String(p.id),
                name: p.name,
            }));
        });
    }
    post(id, accessToken, postDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const [firstPost] = postDetails;
            const channel = firstPost.settings.channel;
            const form = new FormData();
            form.append('payload_json', JSON.stringify({
                content: firstPost.message.replace(/\[\[\[(@.*?)]]]/g, (match, p1) => {
                    return `<${p1}>`;
                }),
                attachments: (_a = firstPost.media) === null || _a === void 0 ? void 0 : _a.map((p, index) => ({
                    id: index,
                    description: `Picture ${index}`,
                    filename: p.path.split('/').pop(),
                })),
            }));
            let index = 0;
            for (const media of firstPost.media || []) {
                const loadMedia = yield fetch(media.path);
                form.append(`files[${index}]`, yield loadMedia.blob(), media.path.split('/').pop());
                index++;
            }
            const data = yield (yield fetch(`https://discord.com/api/channels/${channel}/messages`, {
                method: 'POST',
                headers: {
                    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_ID}`,
                },
                body: form,
            })).json();
            return [
                {
                    id: firstPost.id,
                    releaseURL: `https://discord.com/channels/${id}/${channel}/${data.id}`,
                    postId: data.id,
                    status: 'success',
                },
            ];
        });
    }
    comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const [commentPost] = postDetails;
            const channel = commentPost.settings.channel;
            // For Discord, we create a thread from the original message for comments
            // If we don't have a thread yet, create one
            let threadChannel = channel;
            // Create thread if this is the first comment
            if (!lastCommentId) {
                const { id: threadId } = yield (yield fetch(`https://discord.com/api/channels/${channel}/messages/${postId}/threads`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_ID}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: 'Thread',
                        auto_archive_duration: 1440,
                    }),
                })).json();
                threadChannel = threadId;
            }
            else {
                // Extract thread channel from the last comment's URL or use channel directly
                threadChannel = channel;
            }
            const form = new FormData();
            form.append('payload_json', JSON.stringify({
                content: commentPost.message.replace(/\[\[\[(@.*?)]]]/g, (match, p1) => {
                    return `<${p1}>`;
                }),
                attachments: (_a = commentPost.media) === null || _a === void 0 ? void 0 : _a.map((p, index) => ({
                    id: index,
                    description: `Picture ${index}`,
                    filename: p.path.split('/').pop(),
                })),
            }));
            let index = 0;
            for (const media of commentPost.media || []) {
                const loadMedia = yield fetch(media.path);
                form.append(`files[${index}]`, yield loadMedia.blob(), media.path.split('/').pop());
                index++;
            }
            const data = yield (yield fetch(`https://discord.com/api/channels/${threadChannel}/messages`, {
                method: 'POST',
                headers: {
                    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_ID}`,
                },
                body: form,
            })).json();
            return [
                {
                    id: commentPost.id,
                    releaseURL: `https://discord.com/channels/${id}/${threadChannel}/${data.id}`,
                    postId: data.id,
                    status: 'success',
                },
            ];
        });
    }
    changeNickname(id, accessToken, name) {
        return __awaiter(this, void 0, void 0, function* () {
            yield (yield fetch(`https://discord.com/api/guilds/${id}/members/@me`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_ID}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nick: name,
                }),
            })).json();
            return {
                name,
            };
        });
    }
    mention(token, data, id, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const allRoles = yield (yield fetch(`https://discord.com/api/guilds/${id}/roles`, {
                headers: {
                    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_ID}`,
                    'Content-Type': 'application/json',
                },
            })).json();
            const matching = allRoles
                .filter((role) => role.name.toLowerCase().includes(data.query.toLowerCase()))
                .filter((f) => f.name !== '@everyone' && f.name !== '@here');
            const list = yield (yield fetch(`https://discord.com/api/guilds/${id}/members/search?query=${data.query}`, {
                headers: {
                    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_ID}`,
                    'Content-Type': 'application/json',
                },
            })).json();
            return [
                ...[
                    {
                        id: String('here'),
                        label: 'here',
                        image: '',
                        doNotCache: true,
                    },
                    {
                        id: String('everyone'),
                        label: 'everyone',
                        image: '',
                        doNotCache: true,
                    },
                ].filter((role) => {
                    return role.label.toLowerCase().includes(data.query.toLowerCase());
                }),
                ...matching.map((p) => ({
                    id: String('&' + p.id),
                    label: p.name.split('@')[1],
                    image: '',
                    doNotCache: true,
                })),
                ...list.map((p) => ({
                    id: String(p.user.id),
                    label: p.user.global_name || p.user.username,
                    image: `https://cdn.discordapp.com/avatars/${p.user.id}/${p.user.avatar}.png`,
                })),
            ];
        });
    }
    mentionFormat(idOrHandle, name) {
        if (name === '@here' || name === '@everyone') {
            return name;
        }
        return `[[[@${idOrHandle.replace('@', '')}]]]`;
    }
}
__decorate([
    Tool({ description: 'Channels', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], DiscordProvider.prototype, "channels", null);
//# sourceMappingURL=discord.provider.js.map