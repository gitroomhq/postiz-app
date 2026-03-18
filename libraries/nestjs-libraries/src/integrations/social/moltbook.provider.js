import { __awaiter } from "tslib";
import { makeId } from "../../services/make.is";
import { SocialAbstract } from "../social.abstract";
import dayjs from 'dayjs';
import axios from 'axios';
const MOLTBOOK_API_BASE = 'https://www.moltbook.com/api/v1';
export class MoltbookProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 100; // Moltbook: 100 requests/minute
        this.identifier = 'moltbook';
        this.name = 'Moltbook';
        this.isBetweenSteps = false;
        this.scopes = [];
        this.isWeb3 = true;
        this.editor = 'normal';
    }
    maxLength() {
        return 300;
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
                url: state,
                codeVerifier: makeId(10),
                state,
            };
        });
    }
    registerAgent(name, description) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios.post(`${MOLTBOOK_API_BASE}/agents/register`, { name, description }, { headers: { 'Content-Type': 'application/json' } });
            if (!response.data.success) {
                throw new Error(response.data.error || 'Registration failed');
            }
            return response.data.agent;
        });
    }
    checkAgentStatus(apiKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios.get(`${MOLTBOOK_API_BASE}/agents/status`, {
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            return response.data;
        });
    }
    getAgentProfile(apiKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios.get(`${MOLTBOOK_API_BASE}/agents/me`, {
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            if (!response.data.success) {
                throw new Error(response.data.error || 'Failed to get profile');
            }
            return response.data.agent;
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const apiKey = params.code;
            const profile = yield this.getAgentProfile(apiKey);
            return {
                id: profile.name || profile.id,
                name: profile.display_name || profile.name,
                accessToken: apiKey,
                refreshToken: '',
                expiresIn: dayjs().add(200, 'year').unix() - dayjs().unix(),
                picture: '',
                username: profile.name,
            };
        });
    }
    post(id, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const results = [];
            for (const post of postDetails) {
                const postData = {
                    submolt: ((_a = post.settings) === null || _a === void 0 ? void 0 : _a.submolt) || 'general',
                    title: post.message.slice(0, 100),
                    content: post.message,
                };
                const response = yield axios.post(`${MOLTBOOK_API_BASE}/posts`, postData, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });
                if (!response.data.success) {
                    throw new Error(response.data.error || 'Failed to create post');
                }
                const postId = response.data.post.id;
                results.push({
                    id: post.id,
                    postId: String(postId),
                    releaseURL: `https://www.moltbook.com/post/${postId}`,
                    status: 'completed',
                });
            }
            return results;
        });
    }
    comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [];
            for (const post of postDetails) {
                const commentData = {
                    content: post.message,
                };
                if (lastCommentId) {
                    commentData.parent_id = lastCommentId;
                }
                const response = yield axios.post(`${MOLTBOOK_API_BASE}/posts/${postId}/comments`, commentData, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });
                if (!response.data.success) {
                    throw new Error(response.data.error || 'Failed to create comment');
                }
                const commentId = response.data.comment.id;
                results.push({
                    id: post.id,
                    postId: String(commentId),
                    releaseURL: `https://www.moltbook.com/post/${postId}`,
                    status: 'completed',
                });
            }
            return results;
        });
    }
}
//# sourceMappingURL=moltbook.provider.js.map