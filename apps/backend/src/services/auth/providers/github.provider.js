import { __awaiter, __decorate } from "tslib";
import { AuthProvider, AuthProviderAbstract, } from "../providers.interface";
let GithubProvider = class GithubProvider extends AuthProviderAbstract {
    generateLink() {
        return `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user:email&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/settings`)}`;
    }
    getToken(code) {
        return __awaiter(this, void 0, void 0, function* () {
            const { access_token } = yield (yield fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    client_id: process.env.GITHUB_CLIENT_ID,
                    client_secret: process.env.GITHUB_CLIENT_SECRET,
                    code,
                    redirect_uri: `${process.env.FRONTEND_URL}/settings`,
                }),
            })).json();
            return access_token;
        });
    }
    getUser(access_token) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield (yield fetch('https://api.github.com/user', {
                headers: {
                    Authorization: `token ${access_token}`,
                },
            })).json();
            const [{ email }] = yield (yield fetch('https://api.github.com/user/emails', {
                headers: {
                    Authorization: `token ${access_token}`,
                },
            })).json();
            return {
                email: email,
                id: String(data.id),
            };
        });
    }
};
GithubProvider = __decorate([
    AuthProvider({ provider: 'GITHUB' })
], GithubProvider);
export { GithubProvider };
//# sourceMappingURL=github.provider.js.map