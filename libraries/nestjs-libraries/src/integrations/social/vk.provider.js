import { __awaiter } from "tslib";
import { makeId } from "../../services/make.is";
import dayjs from 'dayjs';
import { SocialAbstract } from "../social.abstract";
import { createHash, randomBytes } from 'crypto';
import axios from 'axios';
import FormDataNew from 'form-data';
import mime from 'mime-types';
export class VkProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 2; // VK has moderate API limits
        this.identifier = 'vk';
        this.name = 'VK';
        this.isBetweenSteps = false;
        this.scopes = [
            'vkid.personal_info',
            'email',
            'wall',
            'status',
            'docs',
            'photos',
            'video',
        ];
        this.editor = 'normal';
    }
    maxLength() {
        return 2048;
    }
    refreshToken(refresh) {
        return __awaiter(this, void 0, void 0, function* () {
            const [oldRefreshToken, device_id] = refresh.split('&&&&');
            const formData = new FormData();
            formData.append('grant_type', 'refresh_token');
            formData.append('refresh_token', oldRefreshToken);
            formData.append('client_id', process.env.VK_ID);
            formData.append('device_id', device_id);
            formData.append('state', makeId(32));
            formData.append('scope', this.scopes.join(' '));
            const { access_token, refresh_token, expires_in } = yield (yield this.fetch('https://id.vk.com/oauth2/auth', {
                method: 'POST',
                body: formData,
            })).json();
            const newFormData = new FormData();
            newFormData.append('client_id', process.env.VK_ID);
            newFormData.append('access_token', access_token);
            const { user: { user_id, first_name, last_name, avatar }, } = yield (yield this.fetch('https://id.vk.com/oauth2/user_info', {
                method: 'POST',
                body: newFormData,
            })).json();
            return {
                id: user_id,
                name: first_name + ' ' + last_name,
                accessToken: access_token,
                refreshToken: refresh_token + '&&&&' + device_id,
                expiresIn: dayjs().add(expires_in, 'seconds').unix() - dayjs().unix(),
                picture: avatar || '',
                username: first_name.toLowerCase(),
            };
        });
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const state = makeId(32);
            const codeVerifier = randomBytes(64).toString('base64url');
            const challenge = Buffer.from(createHash('sha256').update(codeVerifier).digest())
                .toString('base64')
                .replace(/=*$/g, '')
                .replace(/\+/g, '-')
                .replace(/\//g, '_');
            return {
                url: 'https://id.vk.com/authorize' +
                    `?response_type=code` +
                    `&client_id=${process.env.VK_ID}` +
                    `&code_challenge_method=S256` +
                    `&code_challenge=${challenge}` +
                    `&redirect_uri=${encodeURIComponent(`${((_a = process === null || process === void 0 ? void 0 : process.env.FRONTEND_URL) === null || _a === void 0 ? void 0 : _a.indexOf('https')) == -1
                        ? `https://redirectmeto.com/${process === null || process === void 0 ? void 0 : process.env.FRONTEND_URL}`
                        : `${process === null || process === void 0 ? void 0 : process.env.FRONTEND_URL}`}/integrations/social/vk`)}` +
                    `&state=${state}` +
                    `&scope=${encodeURIComponent(this.scopes.join(' '))}`,
                codeVerifier,
                state,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const [code, device_id] = params.code.split('&&&&');
            const formData = new FormData();
            formData.append('client_id', process.env.VK_ID);
            formData.append('grant_type', 'authorization_code');
            formData.append('code_verifier', params.codeVerifier);
            formData.append('device_id', device_id);
            formData.append('code', code);
            formData.append('redirect_uri', `${((_a = process === null || process === void 0 ? void 0 : process.env.FRONTEND_URL) === null || _a === void 0 ? void 0 : _a.indexOf('https')) == -1
                ? `https://redirectmeto.com/${process === null || process === void 0 ? void 0 : process.env.FRONTEND_URL}`
                : `${process === null || process === void 0 ? void 0 : process.env.FRONTEND_URL}`}/integrations/social/vk`);
            const { access_token, scope, refresh_token, expires_in } = yield (yield this.fetch('https://id.vk.com/oauth2/auth', {
                method: 'POST',
                body: formData,
            })).json();
            const newFormData = new FormData();
            newFormData.append('client_id', process.env.VK_ID);
            newFormData.append('access_token', access_token);
            const { user: { user_id, first_name, last_name, avatar }, } = yield (yield this.fetch('https://id.vk.com/oauth2/user_info', {
                method: 'POST',
                body: newFormData,
            })).json();
            return {
                id: user_id,
                name: first_name + ' ' + last_name,
                accessToken: access_token,
                refreshToken: refresh_token + '&&&&' + device_id,
                expiresIn: dayjs().add(expires_in, 'seconds').unix() - dayjs().unix(),
                picture: avatar || '',
                username: first_name.toLowerCase(),
            };
        });
    }
    uploadMedia(userId, accessToken, post) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Promise.all(((post === null || post === void 0 ? void 0 : post.media) || []).map((media) => __awaiter(this, void 0, void 0, function* () {
                const all = yield (yield this.fetch(media.path.indexOf('mp4') > -1
                    ? `https://api.vk.com/method/video.save?access_token=${accessToken}&v=5.251`
                    : `https://api.vk.com/method/photos.getWallUploadServer?owner_id=${userId}&access_token=${accessToken}&v=5.251`)).json();
                const { data } = yield axios.get(media.path, {
                    responseType: 'stream',
                });
                const slash = media.path.split('/').at(-1);
                const formData = new FormDataNew();
                formData.append('photo', data, {
                    filename: slash,
                    contentType: mime.lookup(slash) || '',
                });
                const value = (yield axios.post(all.response.upload_url, formData, {
                    headers: Object.assign({}, formData.getHeaders()),
                })).data;
                if (media.path.indexOf('mp4') > -1) {
                    return {
                        id: all.response.video_id,
                        type: 'video',
                    };
                }
                const formSend = new FormData();
                formSend.append('photo', value.photo);
                formSend.append('server', value.server);
                formSend.append('hash', value.hash);
                const { id } = (yield (yield fetch(`https://api.vk.com/method/photos.saveWallPhoto?access_token=${accessToken}&v=5.251`, {
                    method: 'POST',
                    body: formSend,
                })).json()).response[0];
                return {
                    id,
                    type: 'photo',
                };
            })));
        });
    }
    post(userId, accessToken, postDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            const [firstPost] = postDetails;
            // Upload media for the first post
            const mediaList = yield this.uploadMedia(userId, accessToken, firstPost);
            const body = new FormData();
            body.append('message', firstPost.message);
            if (mediaList.length) {
                body.append('attachments', mediaList.map((p) => `${p.type}${userId}_${p.id}`).join(','));
            }
            const { response } = yield (yield this.fetch(`https://api.vk.com/method/wall.post?v=5.251&access_token=${accessToken}&client_id=${process.env.VK_ID}`, {
                method: 'POST',
                body,
            })).json();
            return [
                {
                    id: firstPost.id,
                    postId: String(response === null || response === void 0 ? void 0 : response.post_id),
                    releaseURL: `https://vk.com/feed?w=wall${userId}_${response === null || response === void 0 ? void 0 : response.post_id}`,
                    status: 'completed',
                },
            ];
        });
    }
    comment(userId, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const [commentPost] = postDetails;
            // Upload media for the comment
            const mediaList = yield this.uploadMedia(userId, accessToken, commentPost);
            const body = new FormData();
            body.append('message', commentPost.message);
            body.append('post_id', postId);
            if (mediaList.length) {
                body.append('attachments', mediaList.map((p) => `${p.type}${userId}_${p.id}`).join(','));
            }
            const { response } = yield (yield this.fetch(`https://api.vk.com/method/wall.createComment?v=5.251&access_token=${accessToken}&client_id=${process.env.VK_ID}`, {
                method: 'POST',
                body,
            })).json();
            return [
                {
                    id: commentPost.id,
                    postId: String(response === null || response === void 0 ? void 0 : response.comment_id),
                    releaseURL: `https://vk.com/feed?w=wall${userId}_${postId}`,
                    status: 'completed',
                },
            ];
        });
    }
}
//# sourceMappingURL=vk.provider.js.map