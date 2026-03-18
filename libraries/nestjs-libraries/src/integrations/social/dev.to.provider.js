import { __awaiter, __decorate, __metadata } from "tslib";
import { SocialAbstract } from "../social.abstract";
import dayjs from 'dayjs';
import { makeId } from "../../services/make.is";
import { DevToSettingsDto } from "../../dtos/posts/providers-settings/dev.to.settings.dto";
import { Tool } from "../tool.decorator";
export class DevToProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 3; // Dev.to has moderate publishing limits
        this.identifier = 'devto';
        this.name = 'Dev.to';
        this.isBetweenSteps = false;
        this.editor = 'markdown';
        this.scopes = [];
        this.dto = DevToSettingsDto;
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
    handleErrors(body) {
        if (body.indexOf('Canonical url has already been taken') > -1) {
            return {
                type: 'bad-body',
                value: 'Canonical URL already exists',
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
                const { name, id, profile_image, username } = yield (yield fetch('https://dev.to/api/users/me', {
                    headers: {
                        'api-key': body.apiKey,
                    },
                })).json();
                return {
                    refreshToken: '',
                    expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
                    accessToken: body.apiKey,
                    id,
                    name,
                    picture: profile_image || '',
                    username,
                };
            }
            catch (err) {
                return 'Invalid credentials';
            }
        });
    }
    tags(token) {
        return __awaiter(this, void 0, void 0, function* () {
            const tags = yield (yield fetch('https://dev.to/api/tags?per_page=1000&page=1', {
                headers: {
                    'api-key': token,
                },
            })).json();
            return tags.map((p) => ({ value: p.id, label: p.name }));
        });
    }
    organizations(token) {
        return __awaiter(this, void 0, void 0, function* () {
            const orgs = yield (yield fetch('https://dev.to/api/articles/me/all?per_page=1000', {
                headers: {
                    'api-key': token,
                },
            })).json();
            const allOrgs = [
                ...new Set(orgs
                    .flatMap((org) => { var _a; return (_a = org === null || org === void 0 ? void 0 : org.organization) === null || _a === void 0 ? void 0 : _a.username; })
                    .filter((f) => f)),
            ];
            const fullDetails = yield Promise.all(allOrgs.map((org) => __awaiter(this, void 0, void 0, function* () {
                return (yield fetch(`https://dev.to/api/organizations/${org}`, {
                    headers: {
                        'api-key': token,
                    },
                })).json();
            })));
            return fullDetails.map((org) => ({
                id: org.id,
                name: org.name,
                username: org.username,
            }));
        });
    }
    post(id, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const { settings } = (postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) || { settings: {} };
            const { id: postId, url } = yield (yield this.fetch(`https://dev.to/api/articles`, {
                method: 'POST',
                body: JSON.stringify({
                    article: Object.assign(Object.assign(Object.assign({ title: settings.title, body_markdown: postDetails === null || postDetails === void 0 ? void 0 : postDetails[0].message, published: true }, (((_a = settings === null || settings === void 0 ? void 0 : settings.main_image) === null || _a === void 0 ? void 0 : _a.path)
                        ? { main_image: (_b = settings === null || settings === void 0 ? void 0 : settings.main_image) === null || _b === void 0 ? void 0 : _b.path }
                        : {})), { tags: (_c = settings === null || settings === void 0 ? void 0 : settings.tags) === null || _c === void 0 ? void 0 : _c.map((t) => t.label), organization_id: settings.organization }), (settings.canonical
                        ? { canonical_url: settings.canonical }
                        : {})),
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': accessToken,
                },
            })).json();
            return [
                {
                    id: postDetails === null || postDetails === void 0 ? void 0 : postDetails[0].id,
                    status: 'completed',
                    postId: String(postId),
                    releaseURL: url,
                },
            ];
        });
    }
}
__decorate([
    Tool({ description: 'Tag list', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DevToProvider.prototype, "tags", null);
__decorate([
    Tool({ description: 'Organization list', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DevToProvider.prototype, "organizations", null);
//# sourceMappingURL=dev.to.provider.js.map