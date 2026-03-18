import { __awaiter, __decorate } from "tslib";
import { google } from 'googleapis';
import { AuthProvider, AuthProviderAbstract, } from "../providers.interface";
const clientAndYoutube = () => {
    const client = new google.auth.OAuth2({
        clientId: process.env.YOUTUBE_CLIENT_ID,
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
        redirectUri: `${process.env.FRONTEND_URL}/integrations/social/youtube`,
    });
    const youtube = (newClient) => google.youtube({
        version: 'v3',
        auth: newClient,
    });
    const youtubeAnalytics = (newClient) => google.youtubeAnalytics({
        version: 'v2',
        auth: newClient,
    });
    const oauth2 = (newClient) => google.oauth2({
        version: 'v2',
        auth: newClient,
    });
    return { client, youtube, oauth2, youtubeAnalytics };
};
let GoogleProvider = class GoogleProvider extends AuthProviderAbstract {
    generateLink() {
        const state = 'login';
        const { client } = clientAndYoutube();
        return client.generateAuthUrl({
            access_type: 'online',
            prompt: 'consent',
            state,
            redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/youtube`,
            scope: [
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email',
            ],
        });
    }
    getToken(code) {
        return __awaiter(this, void 0, void 0, function* () {
            const { client, oauth2 } = clientAndYoutube();
            const { tokens } = yield client.getToken(code);
            return tokens.access_token;
        });
    }
    getUser(providerToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const { client, oauth2 } = clientAndYoutube();
            client.setCredentials({ access_token: providerToken });
            const user = oauth2(client);
            const { data } = yield user.userinfo.get();
            return {
                id: data.id,
                email: data.email,
            };
        });
    }
};
GoogleProvider = __decorate([
    AuthProvider({ provider: 'GOOGLE' })
], GoogleProvider);
export { GoogleProvider };
//# sourceMappingURL=google.provider.js.map