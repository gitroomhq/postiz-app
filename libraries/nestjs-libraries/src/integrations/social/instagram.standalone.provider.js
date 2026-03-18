import { __awaiter, __decorate, __rest } from "tslib";
import { makeId } from "../../services/make.is";
import dayjs from 'dayjs';
import { SocialAbstract } from "../social.abstract";
import { InstagramDto } from "../../dtos/posts/providers-settings/instagram.dto";
import { InstagramProvider } from "./instagram.provider";
import { Rules } from "../../chat/rules.description.decorator";
const instagramProvider = new InstagramProvider();
let InstagramStandaloneProvider = class InstagramStandaloneProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'instagram-standalone';
        this.name = 'Instagram\n(Standalone)';
        this.isBetweenSteps = false;
        this.refreshCron = true;
        this.scopes = [
            'instagram_business_basic',
            'instagram_business_content_publish',
            'instagram_business_manage_comments',
            'instagram_business_manage_insights',
        ];
        this.maxConcurrentJob = 200; // Instagram standalone has stricter limits
        this.dto = InstagramDto;
        this.editor = 'normal';
    }
    maxLength() {
        return 2200;
    }
    handleErrors(body) {
        return instagramProvider.handleErrors(body);
    }
    refreshToken(refresh_token) {
        return __awaiter(this, void 0, void 0, function* () {
            const { access_token } = yield (yield fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${refresh_token}`)).json();
            const { user_id, name, username, profile_picture_url = '', } = yield (yield fetch(`https://graph.instagram.com/v21.0/me?fields=user_id,username,name,profile_picture_url&access_token=${access_token}`)).json();
            return {
                id: user_id,
                name,
                accessToken: access_token,
                refreshToken: access_token,
                expiresIn: dayjs().add(58, 'days').unix() - dayjs().unix(),
                picture: profile_picture_url || '',
                username,
            };
        });
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const state = makeId(6);
            return {
                url: `https://www.instagram.com/oauth/authorize?enable_fb_login=0&client_id=${process.env.INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(`${((_a = process === null || process === void 0 ? void 0 : process.env.FRONTEND_URL) === null || _a === void 0 ? void 0 : _a.indexOf('https')) == -1
                    ? `https://redirectmeto.com/${process === null || process === void 0 ? void 0 : process.env.FRONTEND_URL}`
                    : `${process === null || process === void 0 ? void 0 : process.env.FRONTEND_URL}`}/integrations/social/instagram-standalone`)}&response_type=code&scope=${encodeURIComponent(this.scopes.join(','))}` + `&state=${state}`,
                codeVerifier: makeId(10),
                state,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const formData = new FormData();
            formData.append('client_id', process.env.INSTAGRAM_APP_ID);
            formData.append('client_secret', process.env.INSTAGRAM_APP_SECRET);
            formData.append('grant_type', 'authorization_code');
            formData.append('redirect_uri', `${((_a = process === null || process === void 0 ? void 0 : process.env.FRONTEND_URL) === null || _a === void 0 ? void 0 : _a.indexOf('https')) == -1
                ? `https://redirectmeto.com/${process === null || process === void 0 ? void 0 : process.env.FRONTEND_URL}`
                : `${process === null || process === void 0 ? void 0 : process.env.FRONTEND_URL}`}/integrations/social/instagram-standalone`);
            formData.append('code', params.code);
            const getAccessToken = yield (yield fetch('https://api.instagram.com/oauth/access_token', {
                method: 'POST',
                body: formData,
            })).json();
            const _b = yield (yield fetch('https://graph.instagram.com/access_token' +
                '?grant_type=ig_exchange_token' +
                `&client_id=${process.env.INSTAGRAM_APP_ID}` +
                `&client_secret=${process.env.INSTAGRAM_APP_SECRET}` +
                `&access_token=${getAccessToken.access_token}`)).json(), { access_token, expires_in } = _b, all = __rest(_b, ["access_token", "expires_in"]);
            this.checkScopes(this.scopes, getAccessToken.permissions);
            const { user_id, name, username, profile_picture_url } = yield (yield fetch(`https://graph.instagram.com/v21.0/me?fields=user_id,username,name,profile_picture_url&access_token=${access_token}`)).json();
            return {
                id: user_id,
                name,
                accessToken: access_token,
                refreshToken: access_token,
                expiresIn: dayjs().add(58, 'days').unix() - dayjs().unix(),
                picture: profile_picture_url,
                username,
            };
        });
    }
    post(id, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            return instagramProvider.post(id, accessToken, postDetails, integration, 'graph.instagram.com');
        });
    }
    comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            return instagramProvider.comment(id, postId, lastCommentId, accessToken, postDetails, integration, 'graph.instagram.com');
        });
    }
    analytics(id, accessToken, date) {
        return __awaiter(this, void 0, void 0, function* () {
            return instagramProvider.analytics(id, accessToken, date, 'graph.instagram.com');
        });
    }
    postAnalytics(integrationId, accessToken, postId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            return instagramProvider.postAnalytics(integrationId, accessToken, postId, date, 'graph.instagram.com');
        });
    }
};
InstagramStandaloneProvider = __decorate([
    Rules("Instagram should have at least one attachment, if it's a story, it can have only one picture")
], InstagramStandaloneProvider);
export { InstagramStandaloneProvider };
//# sourceMappingURL=instagram.standalone.provider.js.map