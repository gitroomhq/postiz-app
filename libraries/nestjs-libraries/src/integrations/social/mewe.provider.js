import { __awaiter, __decorate, __metadata } from "tslib";
import { makeId } from "../../services/make.is";
import { SocialAbstract } from "../social.abstract";
import dayjs from 'dayjs';
import { MeweDto } from "../../dtos/posts/providers-settings/mewe.dto";
import { Tool } from "../tool.decorator";
export class MeweProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'mewe';
        this.name = 'MeWe';
        this.isBetweenSteps = false;
        this.scopes = [];
        this.editor = 'normal';
        this.dto = MeweDto;
    }
    get meweHost() {
        return process.env.MEWE_HOST || 'https://mewe.com';
    }
    authHeaders(apiToken) {
        return {
            'X-App-Id': process.env.MEWE_APP_ID,
            'X-Api-Key': process.env.MEWE_API_KEY,
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
        };
    }
    maxLength() {
        return 63206;
    }
    handleErrors(body) {
        if (body.indexOf('Unauthorized') > -1) {
            return {
                type: 'refresh-token',
                value: 'Access token expired, please re-authenticate',
            };
        }
        if (body.indexOf('Enhance Your Calm') > -1 || body.indexOf('420') > -1) {
            return {
                type: 'retry',
                value: 'Rate limited, retrying...',
            };
        }
        if (body.indexOf('Forbidden') > -1) {
            return {
                type: 'bad-body',
                value: 'Insufficient permissions for this action',
            };
        }
        return undefined;
    }
    refreshToken(refreshToken) {
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
                url: `${this.meweHost}/login` +
                    `?client_id=${process.env.MEWE_APP_ID}` +
                    `&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/mewe`)}` +
                    `&state=${state}`,
                codeVerifier: makeId(10),
                state,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const loginRequestToken = params.code;
            if (!loginRequestToken) {
                return 'No login request token received. Please try again.';
            }
            try {
                // Exchange loginRequestToken for apiToken
                const tokenResponse = yield fetch(`${this.meweHost}/api/dev/token?loginRequestToken=${loginRequestToken}`, {
                    method: 'GET',
                    headers: {
                        'X-App-Id': process.env.MEWE_APP_ID,
                        'X-Api-Key': process.env.MEWE_API_KEY,
                    },
                });
                if (!tokenResponse.ok) {
                    return 'Failed to exchange token. Please try again.';
                }
                const tokenData = yield tokenResponse.json();
                if (tokenData.pending) {
                    return 'Login request is still pending. Please approve on MeWe and try again.';
                }
                if (!tokenData.apiToken) {
                    return 'No API token received. Please try again.';
                }
                const apiToken = tokenData.apiToken;
                const expiresAt = tokenData.expiresAt;
                // Fetch user profile
                const profileResponse = yield fetch(`${this.meweHost}/api/dev/me`, {
                    method: 'GET',
                    headers: this.authHeaders(apiToken),
                });
                if (!profileResponse.ok) {
                    return 'Failed to fetch MeWe profile.';
                }
                const profile = yield profileResponse.json();
                const expiresIn = expiresAt
                    ? dayjs(expiresAt).unix() - dayjs().unix()
                    : dayjs().add(30, 'days').unix() - dayjs().unix();
                return {
                    id: profile.userId,
                    name: profile.name ||
                        `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
                    accessToken: apiToken,
                    refreshToken: '',
                    expiresIn,
                    picture: '',
                    username: profile.handle || '',
                };
            }
            catch (e) {
                console.log(e);
                return 'MeWe authentication failed. Please try again.';
            }
        });
    }
    groups(accessToken, params, id, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const allGroups = [];
                let nextUrl = `${this.meweHost}/api/dev/groups`;
                while (nextUrl) {
                    const response = yield fetch(nextUrl, {
                        method: 'GET',
                        headers: this.authHeaders(accessToken),
                    });
                    if (!response.ok)
                        break;
                    const data = yield response.json();
                    allGroups.push(...(data.groups || []));
                    nextUrl = data.nextPage ? `${this.meweHost}${data.nextPage}` : null;
                }
                return allGroups.map((group) => ({
                    id: String(group.groupId),
                    name: group.name,
                }));
            }
            catch (err) {
                return [];
            }
        });
    }
    uploadPhoto(accessToken, mediaPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const mediaResponse = yield fetch(mediaPath);
            const blob = yield mediaResponse.blob();
            const fileName = mediaPath.split('/').pop() || 'photo.jpg';
            const form = new FormData();
            form.append('file', blob, fileName);
            const uploadResponse = yield fetch(`${this.meweHost}/api/dev/photo/upload`, {
                method: 'POST',
                headers: {
                    'X-App-Id': process.env.MEWE_APP_ID,
                    'X-Api-Key': process.env.MEWE_API_KEY,
                    Authorization: `Bearer ${accessToken}`,
                },
                body: form,
            });
            if (!uploadResponse.ok) {
                const errorText = yield uploadResponse.text();
                throw new Error(`Photo upload failed: ${errorText}`);
            }
            const uploadData = yield uploadResponse.json();
            return uploadData.id;
        });
    }
    post(id, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const [firstPost] = postDetails;
            const postType = firstPost.settings.postType || 'group';
            const groupId = firstPost.settings.group;
            // Upload photos if present (exclude videos)
            const imageMedia = ((_a = firstPost.media) === null || _a === void 0 ? void 0 : _a.filter((m) => !m.path || m.path.indexOf('mp4') === -1)) ||
                [];
            const uploadedPhotoIds = [];
            for (const media of imageMedia) {
                const photoId = yield this.uploadPhoto(accessToken, media.path);
                uploadedPhotoIds.push(photoId);
            }
            const postBody = { text: firstPost.message };
            if (uploadedPhotoIds.length > 0) {
                postBody.uploadedPhotoIds = uploadedPhotoIds;
            }
            const postUrl = postType === 'timeline'
                ? `${this.meweHost}/api/dev/me/post`
                : `${this.meweHost}/api/dev/group/${groupId}/post`;
            // MeWe post endpoint may return 204 (no content), so use raw fetch
            const postResponse = yield fetch(postUrl, {
                method: 'POST',
                headers: this.authHeaders(accessToken),
                body: JSON.stringify(postBody),
            });
            if (!postResponse.ok) {
                const errorText = yield postResponse.text();
                console.log(errorText);
                const handleError = this.handleErrors(errorText);
                if (handleError) {
                    throw new Error(handleError.value);
                }
                throw new Error('Failed to create MeWe post');
            }
            let postId = '';
            try {
                const responseData = yield postResponse.json();
                postId = responseData.postId || responseData.id || makeId(12);
            }
            catch (_b) {
                postId = makeId(12);
            }
            const releaseURL = `${this.meweHost}/post/show/${postId}`;
            return [
                {
                    id: firstPost.id,
                    postId,
                    releaseURL,
                    status: 'success',
                },
            ];
        });
    }
}
__decorate([
    Tool({ description: 'Groups', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], MeweProvider.prototype, "groups", null);
//# sourceMappingURL=mewe.provider.js.map