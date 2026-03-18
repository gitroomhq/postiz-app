import { __awaiter } from "tslib";
import { makeId } from "../../services/make.is";
import { SocialAbstract } from "../social.abstract";
import { TwitchDto } from "../../dtos/posts/providers-settings/twitch.dto";
import { timer } from "../../../../helpers/src/utils/timer";
export class TwitchProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 1;
        this.identifier = 'twitch';
        this.name = 'Twitch';
        this.isBetweenSteps = false;
        this.editor = 'normal';
        this.scopes = ['user:write:chat', 'user:read:chat', 'moderator:manage:announcements'];
        this.dto = TwitchDto;
    }
    maxLength() {
        return 500; // Twitch chat message max length
    }
    refreshToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.fetch('https://id.twitch.tv/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    client_id: process.env.TWITCH_CLIENT_ID,
                    client_secret: process.env.TWITCH_CLIENT_SECRET,
                    refresh_token: refreshToken,
                }),
            });
            const { access_token, refresh_token, expires_in } = yield response.json();
            // Get user info
            const userInfo = yield this.getUserInfo(access_token);
            return {
                refreshToken: refresh_token,
                expiresIn: expires_in,
                accessToken: access_token,
                id: userInfo.id,
                name: userInfo.name,
                picture: userInfo.picture || '',
                username: userInfo.username,
            };
        });
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            const state = makeId(32);
            const redirectUri = `${process.env.FRONTEND_URL}/integrations/social/twitch`;
            const url = `https://id.twitch.tv/oauth2/authorize` +
                `?response_type=code` +
                `&client_id=${process.env.TWITCH_CLIENT_ID}` +
                `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                `&scope=${encodeURIComponent(this.scopes.join(' '))}` +
                `&state=${state}`;
            return {
                url,
                codeVerifier: makeId(10),
                state,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const redirectUri = `${process.env.FRONTEND_URL}/integrations/social/twitch${params.refresh ? `?refresh=${params.refresh}` : ''}`;
            const tokenResponse = yield this.fetch('https://id.twitch.tv/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: process.env.TWITCH_CLIENT_ID,
                    client_secret: process.env.TWITCH_CLIENT_SECRET,
                    redirect_uri: redirectUri,
                    code: params.code,
                }),
            });
            const { access_token, refresh_token, expires_in } = yield tokenResponse.json();
            // Get user info
            const userInfo = yield this.getUserInfo(access_token);
            return {
                id: userInfo.id,
                name: userInfo.name,
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresIn: expires_in,
                picture: userInfo.picture || '',
                username: userInfo.username,
            };
        });
    }
    getUserInfo(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const userResponse = yield fetch('https://api.twitch.tv/helix/users', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Client-Id': process.env.TWITCH_CLIENT_ID,
                },
            });
            const userData = yield userResponse.json();
            const user = (_a = userData.data) === null || _a === void 0 ? void 0 : _a[0];
            return {
                id: String(user.id),
                name: user.display_name,
                username: user.login,
                picture: user.profile_image_url || '',
            };
        });
    }
    sendAnnouncement(broadcasterId_1, accessToken_1, message_1) {
        return __awaiter(this, arguments, void 0, function* (broadcasterId, accessToken, message, color = 'primary') {
            yield fetch(`https://api.twitch.tv/helix/chat/announcements?broadcaster_id=${broadcasterId}&moderator_id=${broadcasterId}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Client-Id': process.env.TWITCH_CLIENT_ID,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message.substring(0, 500),
                    color,
                }),
            });
            // Announcements return 204 No Content on success
            return { success: true };
        });
    }
    sendChatMessage(broadcasterId, accessToken, message, replyToMessageId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const body = {
                broadcaster_id: broadcasterId,
                sender_id: broadcasterId,
                message: message.substring(0, 500),
            };
            if (replyToMessageId) {
                body.reply_parent_message_id = replyToMessageId;
            }
            const response = yield this.fetch('https://api.twitch.tv/helix/chat/messages', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Client-Id': process.env.TWITCH_CLIENT_ID,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            const data = yield response.json();
            return {
                messageId: ((_b = (_a = data.data) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message_id) || makeId(10),
                isSent: (_e = (_d = (_c = data.data) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.is_sent) !== null && _e !== void 0 ? _e : false,
            };
        });
    }
    post(id, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            yield timer(2000);
            const [firstPost] = postDetails;
            const messageType = ((_a = firstPost.settings) === null || _a === void 0 ? void 0 : _a.messageType) || 'message';
            const announcementColor = ((_b = firstPost.settings) === null || _b === void 0 ? void 0 : _b.announcementColor) || 'primary';
            if (messageType === 'announcement') {
                const result = yield this.sendAnnouncement(id, accessToken, firstPost.message, announcementColor);
                return [
                    {
                        id: firstPost.id,
                        postId: makeId(10), // Announcements don't return a message ID
                        releaseURL: `https://twitch.tv/${integration.profile || integration.providerIdentifier}`,
                        status: result.success ? 'posted' : 'error',
                    },
                ];
            }
            // Regular chat message
            const result = yield this.sendChatMessage(id, accessToken, firstPost.message);
            return [
                {
                    id: firstPost.id,
                    postId: result.messageId,
                    releaseURL: `https://twitch.tv/${integration.profile || integration.providerIdentifier}`,
                    status: result.isSent ? 'posted' : 'error',
                },
            ];
        });
    }
    comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            yield timer(2000);
            const [commentPost] = postDetails;
            const messageType = ((_a = commentPost.settings) === null || _a === void 0 ? void 0 : _a.messageType) || 'message';
            const announcementColor = ((_b = commentPost.settings) === null || _b === void 0 ? void 0 : _b.announcementColor) || 'primary';
            if (messageType === 'announcement') {
                const result = yield this.sendAnnouncement(id, accessToken, commentPost.message, announcementColor);
                return [
                    {
                        id: commentPost.id,
                        postId: makeId(10),
                        releaseURL: `https://twitch.tv/${integration.profile || integration.providerIdentifier}`,
                        status: result.success ? 'posted' : 'error',
                    },
                ];
            }
            // Regular chat message with reply
            const result = yield this.sendChatMessage(id, accessToken, commentPost.message, lastCommentId || postId);
            return [
                {
                    id: commentPost.id,
                    postId: result.messageId,
                    releaseURL: `https://twitch.tv/${integration.profile || integration.providerIdentifier}`,
                    status: result.isSent ? 'posted' : 'error',
                },
            ];
        });
    }
}
//# sourceMappingURL=twitch.provider.js.map