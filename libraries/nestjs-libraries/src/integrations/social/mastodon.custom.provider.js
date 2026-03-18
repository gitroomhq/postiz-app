import { __awaiter, __rest } from "tslib";
import { MastodonProvider } from "./mastodon.provider";
import { makeId } from "../../services/make.is";
export class MastodonCustomProvider extends MastodonProvider {
    constructor() {
        super(...arguments);
        this.identifier = 'mastodon-custom';
        this.name = 'M. Instance';
        this.maxConcurrentJob = 5; // Custom Mastodon instances typically have generous limits
        this.editor = 'normal';
    }
    externalUrl(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const form = new FormData();
            form.append('client_name', 'Postiz');
            form.append('redirect_uris', `${process.env.FRONTEND_URL}/integrations/social/mastodon`);
            form.append('scopes', this.scopes.join(' '));
            form.append('website', process.env.FRONTEND_URL);
            const _a = yield (yield fetch(url + '/api/v1/apps', {
                method: 'POST',
                body: form,
            })).json(), { client_id, client_secret } = _a, all = __rest(_a, ["client_id", "client_secret"]);
            return {
                client_id,
                client_secret,
            };
        });
    }
    generateAuthUrl(refresh, external) {
        return __awaiter(this, void 0, void 0, function* () {
            const state = makeId(6);
            const url = this.generateUrlDynamic(external === null || external === void 0 ? void 0 : external.instanceUrl, state, external === null || external === void 0 ? void 0 : external.client_id, process.env.FRONTEND_URL, refresh);
            return {
                url,
                codeVerifier: makeId(10),
                state,
            };
        });
    }
    authenticate(params, clientInformation) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dynamicAuthenticate(clientInformation === null || clientInformation === void 0 ? void 0 : clientInformation.client_id, clientInformation === null || clientInformation === void 0 ? void 0 : clientInformation.client_secret, clientInformation === null || clientInformation === void 0 ? void 0 : clientInformation.instanceUrl, params.code);
        });
    }
    post(id, accessToken, postDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dynamicPost(id, accessToken, process.env.MASTODON_URL || 'https://mastodon.social', postDetails);
        });
    }
    comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dynamicComment(id, postId, lastCommentId, accessToken, process.env.MASTODON_URL || 'https://mastodon.social', postDetails);
        });
    }
}
//# sourceMappingURL=mastodon.custom.provider.js.map