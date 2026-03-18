import { __awaiter, __decorate, __metadata } from "tslib";
import { SocialAbstract } from "../social.abstract";
import { tags } from "./hashnode.tags";
import { jsonToGraphQLQuery } from 'json-to-graphql-query';
import { HashnodeSettingsDto } from "../../dtos/posts/providers-settings/hashnode.settings.dto";
import dayjs from 'dayjs';
import { makeId } from "../../services/make.is";
import { Tool } from "../tool.decorator";
export class HashnodeProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 3; // Hashnode has lenient publishing limits
        this.identifier = 'hashnode';
        this.name = 'Hashnode';
        this.isBetweenSteps = false;
        this.scopes = [];
        this.editor = 'markdown';
        this.dto = HashnodeSettingsDto;
    }
    maxLength() {
        return 10000;
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
                const { data: { me: { name, id, profilePicture, username }, }, } = yield (yield fetch('https://gql.hashnode.com', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `${body.apiKey}`,
                    },
                    body: JSON.stringify({
                        query: `
                    query {
                      me {
                        name,
                        id,
                        profilePicture
                        username
                      }
                    }
                `,
                    }),
                })).json();
                return {
                    refreshToken: '',
                    expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
                    accessToken: body.apiKey,
                    id,
                    name,
                    picture: profilePicture || '',
                    username,
                };
            }
            catch (err) {
                return 'Invalid credentials';
            }
        });
    }
    tags() {
        return __awaiter(this, void 0, void 0, function* () {
            return tags.map((tag) => ({ value: tag.objectID, label: tag.name }));
        });
    }
    tagsList() {
        return tags;
    }
    publications(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: { me: { publications: { edges }, }, }, } = yield (yield fetch('https://gql.hashnode.com', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `${accessToken}`,
                },
                body: JSON.stringify({
                    query: `
            query {
              me {
                publications (first: 50) {
                  edges{
                    node {
                      id
                      title
                    }
                  }
                }
              }
            }
                `,
                }),
            })).json();
            return edges.map(({ node: { id, title } }) => ({
                id,
                name: title,
            }));
        });
    }
    post(id, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const { settings } = (postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) || { settings: {} };
            const query = jsonToGraphQLQuery({
                mutation: {
                    publishPost: {
                        __args: {
                            input: Object.assign(Object.assign(Object.assign(Object.assign({ title: settings.title, publicationId: settings.publication }, (settings.canonical
                                ? { originalArticleURL: settings.canonical }
                                : {})), { contentMarkdown: postDetails === null || postDetails === void 0 ? void 0 : postDetails[0].message, tags: settings.tags.map((tag) => ({ id: tag.value })) }), (settings.subtitle ? { subtitle: settings.subtitle } : {})), (settings.main_image
                                ? {
                                    coverImageOptions: {
                                        coverImageURL: `${((_b = (_a = settings === null || settings === void 0 ? void 0 : settings.main_image) === null || _a === void 0 ? void 0 : _a.path) === null || _b === void 0 ? void 0 : _b.indexOf('http')) === -1
                                            ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/${process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY}`
                                            : ``}${(_c = settings === null || settings === void 0 ? void 0 : settings.main_image) === null || _c === void 0 ? void 0 : _c.path}`,
                                    },
                                }
                                : {})),
                        },
                        post: {
                            id: true,
                            url: true,
                        },
                    },
                },
            }, { pretty: true });
            const { data: { publishPost: { post: { id: postId, url }, }, }, } = yield (yield this.fetch('https://gql.hashnode.com', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `${accessToken}`,
                },
                body: JSON.stringify({
                    query,
                }),
            })).json();
            return [
                {
                    id: postDetails === null || postDetails === void 0 ? void 0 : postDetails[0].id,
                    status: 'completed',
                    postId: postId,
                    releaseURL: url,
                },
            ];
        });
    }
}
__decorate([
    Tool({ description: 'Tags', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HashnodeProvider.prototype, "tagsList", null);
__decorate([
    Tool({ description: 'Publications', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HashnodeProvider.prototype, "publications", null);
//# sourceMappingURL=hashnode.provider.js.map