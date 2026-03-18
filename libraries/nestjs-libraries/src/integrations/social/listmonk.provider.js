import { __awaiter, __decorate, __metadata } from "tslib";
import { makeId } from "../../services/make.is";
import { SocialAbstract } from '../social.abstract';
import dayjs from 'dayjs';
import { ListmonkDto } from "../../dtos/posts/providers-settings/listmonk.dto";
import { AuthService } from "../../../../helpers/src/auth/auth.service";
import slugify from 'slugify';
import { Tool } from "../tool.decorator";
export class ListmonkProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 100; // Bluesky has moderate rate limits
        this.identifier = 'listmonk';
        this.name = 'ListMonk';
        this.isBetweenSteps = false;
        this.scopes = [];
        this.editor = 'html';
        this.dto = ListmonkDto;
    }
    maxLength() {
        return 100000000;
    }
    customFields() {
        return __awaiter(this, void 0, void 0, function* () {
            return [
                {
                    key: 'url',
                    label: 'URL',
                    defaultValue: '',
                    validation: `/^(https?:\\/\\/)(?:\\S+(?::\\S*)?@)?(?:(?:localhost)|(?:\\d{1,3}(?:\\.\\d{1,3}){3})|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63})(?::\\d{2,5})?(?:\\/[^\\s?#]*)?(?:\\?[^\\s#]*)?(?:#[^\\s]*)?$/`,
                    type: 'text',
                },
                {
                    key: 'username',
                    label: 'Username',
                    validation: `/^.+$/`,
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
            const body = JSON.parse(Buffer.from(params.code, 'base64').toString());
            console.log(body);
            try {
                const basic = Buffer.from(body.username + ':' + body.password).toString('base64');
                const { data } = yield (yield this.fetch(body.url + '/api/settings', {
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: 'Basic ' + basic,
                    },
                })).json();
                return {
                    refreshToken: basic,
                    expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
                    accessToken: basic,
                    id: Buffer.from(body.url).toString('base64'),
                    name: data['app.site_name'],
                    picture: data['app.logo_url'] || '',
                    username: data['app.site_name'],
                };
            }
            catch (e) {
                console.log(e);
                return 'Invalid credentials';
            }
        });
    }
    list(token, data, internalId, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = JSON.parse(AuthService.fixedDecryption(integration.customInstanceDetails));
            const auth = Buffer.from(`${body.username}:${body.password}`).toString('base64');
            const postTypes = yield (yield this.fetch(`${body.url}/api/lists`, {
                headers: {
                    Authorization: `Basic ${auth}`,
                },
            })).json();
            return postTypes.data.results.map((p) => ({ id: p.id, name: p.name }));
        });
    }
    templates(token, data, internalId, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = JSON.parse(AuthService.fixedDecryption(integration.customInstanceDetails));
            const auth = Buffer.from(`${body.username}:${body.password}`).toString('base64');
            const postTypes = yield (yield this.fetch(`${body.url}/api/templates`, {
                headers: {
                    Authorization: `Basic ${auth}`,
                },
            })).json();
            return [
                { id: 0, name: 'Default' },
                ...postTypes.data.map((p) => ({ id: p.id, name: p.name })),
            ];
        });
    }
    post(id, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const body = JSON.parse(AuthService.fixedDecryption(integration.customInstanceDetails));
            const auth = Buffer.from(`${body.username}:${body.password}`).toString('base64');
            const sendBody = `
<style>
.content {
  padding: 20px;
  font-size: 15px;
  line-height: 1.6;
}
</style>
<div class="hidden-preheader"
       style="display:none !important; visibility:hidden; opacity:0; overflow:hidden;
              max-height:0; max-width:0; line-height:1px; font-size:1px; color:transparent;
              mso-hide:all;">
    <!-- A short visible decoy (optional): shows as "." or short text in preview -->
    ${((_b = (_a = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _a === void 0 ? void 0 : _a.settings) === null || _b === void 0 ? void 0 : _b.preview) || ''}
    <!-- Then invisible padding to eat up preview characters -->
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    <!-- Repeat the trio (zero-width space, zero-width non-joiner, nbsp, BOM) a bunch of times -->
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
  </div>
  
  <div class="content">
    ${postDetails[0].message}
  </div>
`;
            const { data: { uuid: postId, id: campaignId }, } = yield (yield this.fetch(body.url + '/api/campaigns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Basic ${auth}`,
                },
                body: JSON.stringify(Object.assign({ name: slugify(postDetails[0].settings.subject, {
                        lower: true,
                        strict: true,
                        trim: true,
                    }), type: 'regular', content_type: 'html', subject: postDetails[0].settings.subject, lists: [+postDetails[0].settings.list], body: sendBody }, (+((_d = (_c = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _c === void 0 ? void 0 : _c.settings) === null || _d === void 0 ? void 0 : _d.template)
                    ? { template_id: +postDetails[0].settings.template }
                    : {}))),
            })).json();
            yield this.fetch(body.url + `/api/campaigns/${campaignId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Basic ${auth}`,
                },
                body: JSON.stringify({
                    status: 'running',
                }),
            });
            return [
                {
                    id: postDetails[0].id,
                    status: 'completed',
                    releaseURL: `${body.url}/api/campaigns/${campaignId}/preview`,
                    postId,
                },
            ];
        });
    }
}
__decorate([
    Tool({ description: 'List of available lists', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], ListmonkProvider.prototype, "list", null);
__decorate([
    Tool({ description: 'List of available templates', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], ListmonkProvider.prototype, "templates", null);
//# sourceMappingURL=listmonk.provider.js.map