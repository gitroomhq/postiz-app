import { __awaiter, __decorate, __metadata } from "tslib";
import { createHash, randomBytes } from 'crypto';
import { makeId } from "../../services/make.is";
import { timer } from "../../../../helpers/src/utils/timer";
import { SocialAbstract } from "../social.abstract";
import { WhopDto } from "../../dtos/posts/providers-settings/whop.dto";
import { Tool } from "../tool.decorator";
export class WhopProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'whop';
        this.name = 'Whop';
        this.isBetweenSteps = false;
        this.scopes = ['openid', 'profile', 'email', 'forum:post:create', 'forum:read', 'company:basic:read'];
        this.refreshCron = false;
        this.editor = 'markdown';
        this.dto = WhopDto;
        this.toolTip = 'Schedule posts to forums';
    }
    maxLength() {
        return 50000;
    }
    generateCodeChallenge(codeVerifier) {
        return createHash('sha256').update(codeVerifier).digest('base64url');
    }
    handleErrors(body) {
        if (body.includes('invalid_grant')) {
            return {
                type: 'refresh-token',
                value: 'Invalid token, please re-authenticate',
            };
        }
        if (body.includes('insufficient_scope')) {
            return {
                type: 'refresh-token',
                value: 'Insufficient permissions, please re-authenticate with required scopes',
            };
        }
        if (body.includes('invalid_request')) {
            return {
                type: 'bad-body',
                value: 'Invalid request parameters',
            };
        }
        if (body.includes('not_found')) {
            return {
                type: 'bad-body',
                value: 'Forum or experience not found',
            };
        }
        return undefined;
    }
    refreshToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield (yield fetch('https://api.whop.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                    client_id: process.env.WHOP_CLIENT_ID,
                }),
            })).json();
            const userInfo = yield (yield fetch('https://api.whop.com/oauth/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` },
            })).json();
            return {
                id: userInfo.sub,
                name: userInfo.name || userInfo.preferred_username || '',
                accessToken: response.access_token,
                refreshToken: response.refresh_token,
                expiresIn: response.expires_in || 3600,
                picture: userInfo.picture || '',
                username: userInfo.preferred_username || '',
            };
        });
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            const state = makeId(6);
            const codeVerifier = randomBytes(32).toString('base64url');
            const codeChallenge = this.generateCodeChallenge(codeVerifier);
            const nonce = makeId(16);
            return {
                url: 'https://api.whop.com/oauth/authorize' +
                    `?response_type=code` +
                    `&client_id=${process.env.WHOP_CLIENT_ID}` +
                    `&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/whop`)}` +
                    `&scope=${encodeURIComponent(this.scopes.join(' '))}` +
                    `&state=${state}` +
                    `&nonce=${nonce}` +
                    `&code_challenge=${codeChallenge}` +
                    `&code_challenge_method=S256`,
                codeVerifier,
                state,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const redirectUri = `${process.env.FRONTEND_URL}/integrations/social/whop${params.refresh ? `?refresh=${params.refresh}` : ''}`;
            const tokenResponse = yield (yield fetch('https://api.whop.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grant_type: 'authorization_code',
                    code: params.code,
                    redirect_uri: redirectUri,
                    client_id: process.env.WHOP_CLIENT_ID,
                    code_verifier: params.codeVerifier,
                }),
            })).json();
            if (tokenResponse.error) {
                return `Authentication failed: ${tokenResponse.error_description || tokenResponse.error}`;
            }
            const userInfo = yield (yield fetch('https://api.whop.com/oauth/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            })).json();
            return {
                id: userInfo.sub,
                name: userInfo.name || userInfo.preferred_username || '',
                accessToken: tokenResponse.access_token,
                refreshToken: tokenResponse.refresh_token,
                expiresIn: tokenResponse.expires_in || 3600,
                picture: userInfo.picture || '',
                username: userInfo.preferred_username || '',
            };
        });
    }
    companies(accessToken, params, id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch('https://api.whop.com/api/v1/companies?first=50', {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
                const { data } = yield response.json();
                return (data || []).map((company) => ({
                    id: company.id,
                    name: company.title,
                }));
            }
            catch (_a) {
                return [];
            }
        });
    }
    experiences(accessToken, params, id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!(params === null || params === void 0 ? void 0 : params.id))
                    return [];
                const response = yield fetch(`https://api.whop.com/api/v1/forums?company_id=${params.id}&first=50`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
                const { data } = yield response.json();
                return (data || []).map((forum) => {
                    var _a, _b;
                    return ({
                        id: ((_a = forum.experience) === null || _a === void 0 ? void 0 : _a.id) || forum.id,
                        name: ((_b = forum.experience) === null || _b === void 0 ? void 0 : _b.name) || forum.id,
                    });
                });
            }
            catch (_a) {
                return [];
            }
        });
    }
    uploadMediaToWhop(media, accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!media || media.length === 0)
                return [];
            const attachments = [];
            for (const item of media) {
                const fileResponse = yield fetch(item.path);
                const fileBuffer = yield fileResponse.arrayBuffer();
                const fileName = item.path.split('/').pop() || 'file';
                const createFileResponse = yield (yield this.fetch('https://api.whop.com/api/v1/files', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        filename: fileName,
                    }),
                }, 'create file record')).json();
                if (createFileResponse.upload_url) {
                    yield fetch(createFileResponse.upload_url, {
                        method: 'PUT',
                        headers: createFileResponse.upload_headers || {},
                        body: fileBuffer,
                    });
                    let uploadStatus = 'pending';
                    while (uploadStatus !== 'ready') {
                        const fileStatus = yield (yield this.fetch(`https://api.whop.com/api/v1/files/${createFileResponse.id}`, {
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                            },
                        }, 'check file status', 0, true)).json();
                        uploadStatus = fileStatus.upload_status;
                        if (uploadStatus === 'failed') {
                            throw new Error('File upload failed');
                        }
                        if (uploadStatus !== 'ready') {
                            yield timer(5000);
                        }
                    }
                }
                attachments.push({ id: createFileResponse.id });
            }
            return attachments;
        });
    }
    post(id, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const [post] = postDetails;
            const attachments = yield this.uploadMediaToWhop(post.media || [], accessToken);
            const data = yield (yield this.fetch('https://api.whop.com/api/v1/forum_posts', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(Object.assign(Object.assign({ experience_id: post.settings.experience, content: post.message }, (post.settings.title ? { title: post.settings.title } : {})), (attachments.length ? { attachments } : {}))),
            }, 'create forum post')).json();
            return [
                {
                    id: post.id,
                    postId: data.id,
                    releaseURL: `https://whop.com/experiences/${post.settings.experience}/${data.id}`,
                    status: 'success',
                },
            ];
        });
    }
    comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const [post] = postDetails;
            const replyToId = lastCommentId || postId;
            const attachments = yield this.uploadMediaToWhop(post.media || [], accessToken);
            const data = yield (yield this.fetch('https://api.whop.com/api/v1/forum_posts', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(Object.assign({ experience_id: post.settings.experience, content: post.message, parent_id: replyToId }, (attachments.length ? { attachments } : {}))),
            }, 'create comment')).json();
            return [
                {
                    id: post.id,
                    postId: data.id,
                    releaseURL: `https://whop.com/experiences/${post.settings.experience}/${postId}`,
                    status: 'success',
                },
            ];
        });
    }
}
__decorate([
    Tool({ description: 'Companies', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], WhopProvider.prototype, "companies", null);
__decorate([
    Tool({ description: 'Experiences', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], WhopProvider.prototype, "experiences", null);
//# sourceMappingURL=whop.provider.js.map