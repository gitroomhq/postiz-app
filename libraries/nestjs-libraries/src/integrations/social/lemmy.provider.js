import { __awaiter, __decorate, __metadata } from "tslib";
import { makeId } from "../../services/make.is";
import { SocialAbstract } from "../social.abstract";
import dayjs from 'dayjs';
import { AuthService } from "../../../../helpers/src/auth/auth.service";
import { LemmySettingsDto } from "../../dtos/posts/providers-settings/lemmy.dto";
import { Tool } from "../tool.decorator";
export class LemmyProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 3; // Lemmy instances typically have moderate limits
        this.identifier = 'lemmy';
        this.name = 'Lemmy';
        this.isBetweenSteps = false;
        this.scopes = [];
        this.editor = 'normal';
        this.dto = LemmySettingsDto;
    }
    maxLength() {
        return 10000;
    }
    customFields() {
        return __awaiter(this, void 0, void 0, function* () {
            return [
                {
                    key: 'service',
                    label: 'Service',
                    defaultValue: 'https://lemmy.world',
                    validation: `/^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$/`,
                    type: 'text',
                },
                {
                    key: 'identifier',
                    label: 'Identifier',
                    validation: `/^.{3,}$/`,
                    type: 'text',
                },
                {
                    key: 'password',
                    label: 'Password',
                    validation: `/^.{3,}$/`,
                    type: 'password',
                },
            ];
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
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const body = JSON.parse(Buffer.from(params.code, 'base64').toString());
            const load = yield fetch(body.service + '/api/v3/user/login', {
                body: JSON.stringify({
                    username_or_email: body.identifier,
                    password: body.password,
                }),
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (load.status === 401) {
                return 'Invalid credentials';
            }
            const { jwt } = yield load.json();
            try {
                const user = yield (yield fetch(body.service + `/api/v3/user?username=${body.identifier}`, {
                    headers: {
                        Authorization: `Bearer ${jwt}`,
                    },
                })).json();
                return {
                    refreshToken: jwt,
                    expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
                    accessToken: jwt,
                    id: String(user.person_view.person.id),
                    name: user.person_view.person.display_name ||
                        user.person_view.person.name ||
                        '',
                    picture: ((_b = (_a = user === null || user === void 0 ? void 0 : user.person_view) === null || _a === void 0 ? void 0 : _a.person) === null || _b === void 0 ? void 0 : _b.avatar) || '',
                    username: body.identifier || '',
                };
            }
            catch (e) {
                console.log(e);
                return 'Invalid credentials';
            }
        });
    }
    getJwtAndService(integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = JSON.parse(AuthService.fixedDecryption(integration.customInstanceDetails));
            const { jwt } = yield (yield fetch(body.service + '/api/v3/user/login', {
                body: JSON.stringify({
                    username_or_email: body.identifier,
                    password: body.password,
                }),
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })).json();
            return { jwt, service: body.service };
        });
    }
    post(id, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const [firstPost] = postDetails;
            const { jwt, service } = yield this.getJwtAndService(integration);
            const valueArray = [];
            for (const lemmy of firstPost.settings.subreddit) {
                console.log(Object.assign(Object.assign(Object.assign({ community_id: +lemmy.value.id, name: lemmy.value.title, body: firstPost.message }, (lemmy.value.url ? { url: lemmy.value.url } : {})), (((_a = firstPost.media) === null || _a === void 0 ? void 0 : _a.length)
                    ? { custom_thumbnail: firstPost.media[0].path }
                    : {})), { nsfw: false }));
                const { post_view } = yield (yield fetch(service + '/api/v3/post', {
                    body: JSON.stringify(Object.assign(Object.assign(Object.assign({ community_id: +lemmy.value.id, name: lemmy.value.title, body: firstPost.message }, (lemmy.value.url
                        ? {
                            url: lemmy.value.url.indexOf('http') === -1
                                ? `https://${lemmy.value.url}`
                                : lemmy.value.url,
                        }
                        : {})), (((_b = firstPost.media) === null || _b === void 0 ? void 0 : _b.length)
                        ? { custom_thumbnail: firstPost.media[0].path }
                        : {})), { nsfw: false })),
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${jwt}`,
                        'Content-Type': 'application/json',
                    },
                })).json();
                valueArray.push({
                    postId: post_view.post.id,
                    releaseURL: service + '/post/' + post_view.post.id,
                    id: firstPost.id,
                    status: 'published',
                });
            }
            return [
                {
                    id: firstPost.id,
                    postId: valueArray.map((p) => String(p.postId)).join(','),
                    releaseURL: valueArray.map((p) => p.releaseURL).join(','),
                    status: 'published',
                },
            ];
        });
    }
    comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const [commentPost] = postDetails;
            const { jwt, service } = yield this.getJwtAndService(integration);
            // postId can be comma-separated if posted to multiple communities
            const postIds = postId.split(',');
            const valueArray = [];
            for (const singlePostId of postIds) {
                const { comment_view } = yield (yield fetch(service + '/api/v3/comment', {
                    body: JSON.stringify({
                        post_id: +singlePostId,
                        content: commentPost.message,
                    }),
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${jwt}`,
                        'Content-Type': 'application/json',
                    },
                })).json();
                valueArray.push({
                    postId: String(comment_view.comment.id),
                    releaseURL: service + '/comment/' + comment_view.comment.id,
                    id: commentPost.id,
                    status: 'published',
                });
            }
            return [
                {
                    id: commentPost.id,
                    postId: valueArray.map((p) => p.postId).join(','),
                    releaseURL: valueArray.map((p) => p.releaseURL).join(','),
                    status: 'published',
                },
            ];
        });
    }
    subreddits(accessToken, data, id, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const { jwt, service } = yield this.getJwtAndService(integration);
            const { communities } = yield (yield fetch(service + `/api/v3/search?type_=Communities&sort=Active&q=${data.word}`, {
                headers: {
                    Authorization: `Bearer ${jwt}`,
                },
            })).json();
            return communities.map((p) => ({
                title: p.community.title,
                name: p.community.title,
                id: p.community.id,
            }));
        });
    }
}
__decorate([
    Tool({
        description: 'Search for Lemmy communities by keyword',
        dataSchema: [
            {
                key: 'word',
                type: 'string',
                description: 'Keyword to search for',
            },
        ],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], LemmyProvider.prototype, "subreddits", null);
//# sourceMappingURL=lemmy.provider.js.map