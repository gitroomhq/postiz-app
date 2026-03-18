import { __awaiter, __decorate, __metadata } from "tslib";
import { SocialAbstract } from "../social.abstract";
import dayjs from 'dayjs';
import { makeId } from "../../services/make.is";
import { MediumSettingsDto } from "../../dtos/posts/providers-settings/medium.settings.dto";
import { Tool } from "../tool.decorator";
export class MediumProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 3; // Medium has lenient publishing limits
        this.identifier = 'medium';
        this.name = 'Medium';
        this.isBetweenSteps = false;
        this.scopes = [];
        this.editor = 'markdown';
        this.dto = MediumSettingsDto;
    }
    maxLength() {
        return 100000;
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
    customFields() {
        return __awaiter(this, void 0, void 0, function* () {
            return [
                {
                    key: 'apiKey',
                    label: 'API key',
                    validation: `/^.{3,}$/`,
                    type: 'password',
                },
            ];
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = JSON.parse(Buffer.from(params.code, 'base64').toString());
            try {
                const { data: { name, id, imageUrl, username }, } = yield (yield fetch('https://api.medium.com/v1/me', {
                    headers: {
                        Authorization: `Bearer ${body.apiKey}`,
                    },
                })).json();
                return {
                    refreshToken: '',
                    expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
                    accessToken: body.apiKey,
                    id,
                    name,
                    picture: imageUrl || '',
                    username,
                };
            }
            catch (err) {
                return 'Invalid credentials';
            }
        });
    }
    publications(accessToken, _, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield (yield fetch(`https://api.medium.com/v1/users/${id}/publications`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })).json();
            return data;
        });
    }
    post(id, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { settings } = (postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) || { settings: {} };
            const { data } = yield (yield fetch((settings === null || settings === void 0 ? void 0 : settings.publication)
                ? `https://api.medium.com/v1/publications/${settings === null || settings === void 0 ? void 0 : settings.publication}/posts`
                : `https://api.medium.com/v1/users/${id}/posts`, {
                method: 'POST',
                body: JSON.stringify(Object.assign(Object.assign(Object.assign({ title: settings.title, contentFormat: 'markdown', content: postDetails === null || postDetails === void 0 ? void 0 : postDetails[0].message }, (settings.canonical ? { canonicalUrl: settings.canonical } : {})), (((_a = settings === null || settings === void 0 ? void 0 : settings.tags) === null || _a === void 0 ? void 0 : _a.length)
                    ? { tags: (_b = settings === null || settings === void 0 ? void 0 : settings.tags) === null || _b === void 0 ? void 0 : _b.map((p) => p.value) }
                    : {})), { publishStatus: (settings === null || settings === void 0 ? void 0 : settings.publication) ? 'draft' : 'public' })),
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            })).json();
            return [
                {
                    id: postDetails === null || postDetails === void 0 ? void 0 : postDetails[0].id,
                    status: 'completed',
                    postId: data.id,
                    releaseURL: data.url,
                },
            ];
        });
    }
}
__decorate([
    Tool({ description: 'List of publications', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], MediumProvider.prototype, "publications", null);
//# sourceMappingURL=medium.provider.js.map