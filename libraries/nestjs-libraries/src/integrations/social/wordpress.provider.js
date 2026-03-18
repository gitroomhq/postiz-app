import { __awaiter, __decorate, __metadata } from "tslib";
import { SocialAbstract } from "../social.abstract";
import dayjs from 'dayjs';
import { makeId } from "../../services/make.is";
import { WordpressDto } from "../../dtos/posts/providers-settings/wordpress.dto";
import slugify from 'slugify';
import { Tool } from "../tool.decorator";
export class WordpressProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'wordpress';
        this.name = 'WordPress';
        this.isBetweenSteps = false;
        this.editor = 'html';
        this.scopes = [];
        this.maxConcurrentJob = 5; // WordPress self-hosted typically has generous limits
        this.dto = WordpressDto;
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
    handleErrors(body) {
        if (body.indexOf('rest_cannot_create') > -1) {
            return {
                type: 'bad-body',
                value: 'The connect user has insufficient permissions to create posts',
            };
        }
        return undefined;
    }
    customFields() {
        return __awaiter(this, void 0, void 0, function* () {
            return [
                {
                    key: 'domain',
                    label: 'Domain URL',
                    validation: `/^https?:\\/\\/(?:www\\.)?[\\w\\-]+(\\.[\\w\\-]+)+([\\/?#][^\\s]*)?$/`,
                    type: 'text',
                },
                {
                    key: 'username',
                    label: 'Username',
                    validation: `/.+/`,
                    type: 'text',
                },
                {
                    key: 'password',
                    label: 'Password',
                    validation: `/.+/`,
                    type: 'password',
                },
            ];
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = JSON.parse(Buffer.from(params.code, 'base64').toString());
            try {
                const auth = Buffer.from(`${body.username}:${body.password}`).toString('base64');
                const { id, name, avatar_urls, code } = yield (yield fetch(`${body.domain}/wp-json/wp/v2/users/me`, {
                    headers: {
                        Authorization: `Basic ${auth}`,
                    },
                })).json();
                if (code) {
                    throw "Invalid credentials";
                }
                const biggestImage = Object.entries(avatar_urls || {}).reduce((all, current) => {
                    if (all > Number(current[0])) {
                        return all;
                    }
                    return Number(current[0]);
                }, 0);
                return {
                    refreshToken: '',
                    expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
                    accessToken: params.code,
                    id: body.domain + '_' + id,
                    name,
                    picture: (avatar_urls === null || avatar_urls === void 0 ? void 0 : avatar_urls[String(biggestImage)]) || '',
                    username: body.username,
                };
            }
            catch (err) {
                console.log(err);
                return 'Invalid credentials';
            }
        });
    }
    postTypes(token) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = JSON.parse(Buffer.from(token, 'base64').toString());
            const auth = Buffer.from(`${body.username}:${body.password}`).toString('base64');
            const postTypes = yield (yield this.fetch(`${body.domain}/wp-json/wp/v2/types`, {
                headers: {
                    Authorization: `Basic ${auth}`,
                },
            })).json();
            return Object.entries(postTypes).reduce((all, [key, value]) => {
                if (key.indexOf('wp_') > -1 ||
                    key.indexOf('nav_') > -1 ||
                    key === 'attachment') {
                    return all;
                }
                all.push({
                    id: value.rest_base,
                    name: value.name,
                });
                return all;
            }, []);
        });
    }
    post(id, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            const body = JSON.parse(Buffer.from(accessToken, 'base64').toString());
            const auth = Buffer.from(`${body.username}:${body.password}`).toString('base64');
            let mediaId = '';
            if ((_c = (_b = (_a = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _a === void 0 ? void 0 : _a.settings) === null || _b === void 0 ? void 0 : _b.main_image) === null || _c === void 0 ? void 0 : _c.path) {
                console.log('Uploading image to WordPress', postDetails[0].settings.main_image.path);
                const blob = yield this.fetch(postDetails[0].settings.main_image.path).then((r) => r.blob());
                const mediaResponse = yield (yield this.fetch(`${body.domain}/wp-json/wp/v2/media`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Basic ${auth}`,
                        'Content-Disposition': `attachment; filename="${postDetails[0].settings.main_image.path
                            .split('/')
                            .pop()}"`,
                        'Content-Type': blob.type,
                    },
                    body: blob,
                })).json();
                mediaId = mediaResponse.id;
            }
            const submit = yield (yield this.fetch(`${body.domain}/wp-json/wp/v2/${(_e = (_d = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _d === void 0 ? void 0 : _d.settings) === null || _e === void 0 ? void 0 : _e.type}`, {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/json',
                },
                method: 'POST',
                body: JSON.stringify(Object.assign({ title: (_g = (_f = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _f === void 0 ? void 0 : _f.settings) === null || _g === void 0 ? void 0 : _g.title, content: (_h = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _h === void 0 ? void 0 : _h.message, slug: slugify((_k = (_j = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _j === void 0 ? void 0 : _j.settings) === null || _k === void 0 ? void 0 : _k.title, {
                        lower: true,
                        strict: true,
                        trim: true,
                    }), status: 'publish' }, (mediaId ? { featured_media: mediaId } : {}))),
            })).json();
            return [
                {
                    id: postDetails === null || postDetails === void 0 ? void 0 : postDetails[0].id,
                    status: 'completed',
                    postId: String(submit.id),
                    releaseURL: submit.link,
                },
            ];
        });
    }
}
__decorate([
    Tool({
        description: 'Get list of post types',
        dataSchema: [],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WordpressProvider.prototype, "postTypes", null);
//# sourceMappingURL=wordpress.provider.js.map