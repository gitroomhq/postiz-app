import { __awaiter, __decorate } from "tslib";
import { AuthProvider, AuthProviderAbstract, } from "../providers.interface";
import { NeynarAPIClient } from '@neynar/nodejs-sdk';
const client = new NeynarAPIClient({
    apiKey: process.env.NEYNAR_SECRET_KEY || '00000000-000-0000-000-000000000000',
});
let FarcasterProvider = class FarcasterProvider extends AuthProviderAbstract {
    generateLink() {
        return '';
    }
    getToken(code) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = JSON.parse(Buffer.from(code, 'base64').toString());
            const status = yield client.lookupSigner({ signerUuid: data.signer_uuid });
            if (status.status === 'approved') {
                return data.signer_uuid;
            }
            return '';
        });
    }
    getUser(providerToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const status = yield client.lookupSigner({ signerUuid: providerToken });
            if (status.status !== 'approved') {
                return {
                    id: '',
                    email: '',
                };
            }
            return {
                id: String('farcaster_' + status.fid),
                email: String('farcaster_' + status.fid),
            };
        });
    }
};
FarcasterProvider = __decorate([
    AuthProvider({ provider: 'FARCASTER' })
], FarcasterProvider);
export { FarcasterProvider };
//# sourceMappingURL=farcaster.provider.js.map