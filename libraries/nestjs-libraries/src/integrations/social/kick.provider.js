import { __awaiter } from "tslib";
import { makeId } from "../../services/make.is";
import { SocialAbstract } from "../social.abstract";
import { KickDto } from "../../dtos/posts/providers-settings/kick.dto";
import { createHash, randomBytes } from 'crypto';
export class KickProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 3;
        this.identifier = 'kick';
        this.name = 'Kick';
        this.isBetweenSteps = false;
        this.editor = 'normal';
        this.scopes = ['chat:write', 'user:read', 'channel:read'];
        this.dto = KickDto;
    }
    maxLength() {
        return 500; // Kick chat message max length
    }
    generatePKCE() {
        const codeVerifier = randomBytes(64).toString('base64url');
        const challenge = Buffer.from(createHash('sha256').update(codeVerifier).digest())
            .toString('base64')
            .replace(/=*$/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
        return { codeVerifier, codeChallenge: challenge };
    }
    refreshToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.fetch('https://id.kick.com/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    client_id: process.env.KICK_CLIENT_ID,
                    client_secret: process.env.KICK_SECRET,
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
            const { codeVerifier, codeChallenge } = this.generatePKCE();
            const redirectUri = `${process.env.FRONTEND_URL}/integrations/social/kick`;
            const url = `https://id.kick.com/oauth/authorize` +
                `?response_type=code` +
                `&client_id=${process.env.KICK_CLIENT_ID}` +
                `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                `&scope=${encodeURIComponent(this.scopes.join(' '))}` +
                `&state=${state}` +
                `&code_challenge=${codeChallenge}` +
                `&code_challenge_method=S256`;
            return {
                url,
                codeVerifier,
                state,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const redirectUri = `${process.env.FRONTEND_URL}/integrations/social/kick${params.refresh ? `?refresh=${params.refresh}` : ''}`;
            const tokenResponse = yield this.fetch('https://id.kick.com/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: process.env.KICK_CLIENT_ID,
                    client_secret: process.env.KICK_SECRET,
                    redirect_uri: redirectUri,
                    code: params.code,
                    code_verifier: params.codeVerifier,
                }),
            });
            const { access_token, refresh_token, expires_in, scope } = yield tokenResponse.json();
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
            // Use token introspect to get basic info, then fetch user details
            // Try to get full user info from the API
            const userResponse = yield fetch('https://api.kick.com/public/v1/users', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const userData = yield userResponse.json();
            const user = ((_a = userData.data) === null || _a === void 0 ? void 0 : _a[0]) || userData.data;
            return {
                id: String(user.user_id || user.id),
                name: user.name,
                username: user.name,
                picture: user.profile_picture || '',
            };
        });
    }
    post(id, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const [firstPost] = postDetails;
            // Post chat message to Kick
            // Note: Kick chat doesn't support media attachments directly in messages
            const response = yield this.fetch('https://api.kick.com/public/v1/chat', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'user',
                    content: firstPost.message.substring(0, 500), // Ensure max length
                    broadcaster_user_id: parseInt(id, 10),
                }),
            });
            const data = yield response.json();
            return [
                {
                    id: firstPost.id,
                    postId: ((_a = data.data) === null || _a === void 0 ? void 0 : _a.message_id) || data.message_id || makeId(10),
                    releaseURL: `https://kick.com/${integration.profile || 'channel'}`,
                    status: ((_b = data.data) === null || _b === void 0 ? void 0 : _b.is_sent) || data.is_sent ? 'posted' : 'error',
                },
            ];
        });
    }
    comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const [commentPost] = postDetails;
            // Kick supports reply_to_message_id for replies
            const response = yield this.fetch('https://api.kick.com/public/v1/chat', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'user',
                    content: commentPost.message.substring(0, 500),
                    broadcaster_user_id: parseInt(id, 10),
                    reply_to_message_id: lastCommentId || postId,
                }),
            });
            const data = yield response.json();
            return [
                {
                    id: commentPost.id,
                    postId: ((_a = data.data) === null || _a === void 0 ? void 0 : _a.message_id) || data.message_id || makeId(10),
                    releaseURL: `https://kick.com/${integration.profile || 'channel'}`,
                    status: ((_b = data.data) === null || _b === void 0 ? void 0 : _b.is_sent) || data.is_sent ? 'posted' : 'error',
                },
            ];
        });
    }
}
//# sourceMappingURL=kick.provider.js.map