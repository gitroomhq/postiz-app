import { __awaiter, __decorate } from "tslib";
import { AuthProvider, AuthProviderAbstract, } from "../providers.interface";
let OauthProvider = class OauthProvider extends AuthProviderAbstract {
    getConfig() {
        const { POSTIZ_OAUTH_AUTH_URL, POSTIZ_OAUTH_CLIENT_ID, POSTIZ_OAUTH_CLIENT_SECRET, POSTIZ_OAUTH_TOKEN_URL, POSTIZ_OAUTH_USERINFO_URL, FRONTEND_URL, } = process.env;
        if (!POSTIZ_OAUTH_USERINFO_URL ||
            !POSTIZ_OAUTH_TOKEN_URL ||
            !POSTIZ_OAUTH_CLIENT_ID ||
            !POSTIZ_OAUTH_CLIENT_SECRET ||
            !POSTIZ_OAUTH_AUTH_URL ||
            !FRONTEND_URL) {
            throw new Error('POSTIZ_OAUTH environment variables are not set');
        }
        return {
            authUrl: POSTIZ_OAUTH_AUTH_URL,
            clientId: POSTIZ_OAUTH_CLIENT_ID,
            clientSecret: POSTIZ_OAUTH_CLIENT_SECRET,
            tokenUrl: POSTIZ_OAUTH_TOKEN_URL,
            userInfoUrl: POSTIZ_OAUTH_USERINFO_URL,
            frontendUrl: FRONTEND_URL,
        };
    }
    generateLink() {
        const { authUrl, clientId, frontendUrl } = this.getConfig();
        const params = new URLSearchParams({
            client_id: clientId,
            scope: 'openid profile email',
            response_type: 'code',
            redirect_uri: `${frontendUrl}/settings`,
        });
        return `${authUrl}?${params.toString()}`;
    }
    getToken(code) {
        return __awaiter(this, void 0, void 0, function* () {
            const { tokenUrl, clientId, clientSecret, frontendUrl } = this.getConfig();
            const response = yield fetch(`${tokenUrl}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: clientId,
                    client_secret: clientSecret,
                    code,
                    redirect_uri: `${frontendUrl}/settings`,
                }),
            });
            if (!response.ok) {
                const error = yield response.text();
                throw new Error(`Token request failed: ${error}`);
            }
            const { access_token } = yield response.json();
            return access_token;
        });
    }
    getUser(access_token) {
        return __awaiter(this, void 0, void 0, function* () {
            const { userInfoUrl } = this.getConfig();
            const response = yield fetch(`${userInfoUrl}`, {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    Accept: 'application/json',
                },
            });
            if (!response.ok) {
                const error = yield response.text();
                throw new Error(`User info request failed: ${error}`);
            }
            const { email, sub: id } = yield response.json();
            return { email, id };
        });
    }
};
OauthProvider = __decorate([
    AuthProvider({ provider: 'GENERIC' })
], OauthProvider);
export { OauthProvider };
//# sourceMappingURL=oauth.provider.js.map