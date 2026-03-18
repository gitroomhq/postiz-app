import { __awaiter } from "tslib";
import { makeId } from "../../services/make.is";
import { SocialAbstract } from "../social.abstract";
import dayjs from 'dayjs';
export class MastodonProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 5; // Mastodon instances typically have generous limits
        this.identifier = 'mastodon';
        this.name = 'Mastodon';
        this.isBetweenSteps = false;
        this.scopes = ['write:statuses', 'profile', 'write:media'];
        this.editor = 'normal';
    }
    maxLength() {
        return 500;
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
    generateUrlDynamic(customUrl, state, clientId, url) {
        return `${customUrl}/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(`${url}/integrations/social/mastodon`)}&scope=${this.scopes.join('+')}&state=${state}`;
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            const state = makeId(6);
            const url = this.generateUrlDynamic(process.env.MASTODON_URL || 'https://mastodon.social', state, process.env.MASTODON_CLIENT_ID, process.env.FRONTEND_URL);
            return {
                url,
                codeVerifier: makeId(10),
                state,
            };
        });
    }
    dynamicAuthenticate(clientId, clientSecret, url, code) {
        return __awaiter(this, void 0, void 0, function* () {
            const form = new FormData();
            form.append('client_id', clientId);
            form.append('client_secret', clientSecret);
            form.append('code', code);
            form.append('grant_type', 'authorization_code');
            form.append('redirect_uri', `${process.env.FRONTEND_URL}/integrations/social/mastodon`);
            form.append('scope', this.scopes.join(' '));
            const tokenInformation = yield (yield this.fetch(`${url}/oauth/token`, {
                method: 'POST',
                body: form,
            })).json();
            const personalInformation = yield (yield this.fetch(`${url}/api/v1/accounts/verify_credentials`, {
                headers: {
                    Authorization: `Bearer ${tokenInformation.access_token}`,
                },
            })).json();
            return {
                id: personalInformation.id,
                name: personalInformation.display_name || personalInformation.acct,
                accessToken: tokenInformation.access_token,
                refreshToken: 'null',
                expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
                picture: (personalInformation === null || personalInformation === void 0 ? void 0 : personalInformation.avatar) || '',
                username: personalInformation.username,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dynamicAuthenticate(process.env.MASTODON_CLIENT_ID, process.env.MASTODON_CLIENT_SECRET, process.env.MASTODON_URL || 'https://mastodon.social', params.code);
        });
    }
    uploadFile(instanceUrl, fileUrl, accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const form = new FormData();
            form.append('file', yield fetch(fileUrl).then((r) => r.blob()));
            const media = yield (yield this.fetch(`${instanceUrl}/api/v1/media`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: form,
            })).json();
            return media.id;
        });
    }
    dynamicPost(id, accessToken, url, postDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const [firstPost] = postDetails;
            const uploadFiles = yield Promise.all(((_a = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _a === void 0 ? void 0 : _a.map((media) => this.uploadFile(url, media.path, accessToken))) || []);
            const form = new FormData();
            form.append('status', firstPost.message);
            form.append('visibility', 'public');
            if (uploadFiles.length) {
                for (const file of uploadFiles) {
                    form.append('media_ids[]', file);
                }
            }
            const post = yield (yield this.fetch(`${url}/api/v1/statuses`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: form,
            })).json();
            return [
                {
                    id: firstPost.id,
                    postId: post.id,
                    releaseURL: `${url}/statuses/${post.id}`,
                    status: 'completed',
                },
            ];
        });
    }
    dynamicComment(id, postId, lastCommentId, accessToken, url, postDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const [commentPost] = postDetails;
            const replyToId = lastCommentId || postId;
            const uploadFiles = yield Promise.all(((_a = commentPost === null || commentPost === void 0 ? void 0 : commentPost.media) === null || _a === void 0 ? void 0 : _a.map((media) => this.uploadFile(url, media.path, accessToken))) || []);
            const form = new FormData();
            form.append('status', commentPost.message);
            form.append('visibility', 'public');
            form.append('in_reply_to_id', replyToId);
            if (uploadFiles.length) {
                for (const file of uploadFiles) {
                    form.append('media_ids[]', file);
                }
            }
            const post = yield (yield this.fetch(`${url}/api/v1/statuses`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: form,
            })).json();
            return [
                {
                    id: commentPost.id,
                    postId: post.id,
                    releaseURL: `${url}/statuses/${post.id}`,
                    status: 'completed',
                },
            ];
        });
    }
    post(id, accessToken, postDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dynamicPost(id, accessToken, process.env.MASTODON_URL || 'https://mastodon.social', postDetails);
        });
    }
    comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dynamicComment(id, postId, lastCommentId, accessToken, process.env.MASTODON_URL || 'https://mastodon.social', postDetails);
        });
    }
}
//# sourceMappingURL=mastodon.provider.js.map