import { __awaiter, __decorate } from "tslib";
import { AuthProvider, AuthProviderAbstract, } from "../providers.interface";
import { randomBytes } from 'crypto';
import { ioRedis } from "../../../../../../libraries/nestjs-libraries/src/redis/redis.service";
import bs58 from 'bs58';
import nacl from 'tweetnacl';
function hexToUint8Array(hex) {
    if (hex.startsWith('0x')) {
        hex = hex.slice(2);
    }
    if (hex.length % 2 !== 0) {
        throw new Error('Invalid hex string. It must have an even length.');
    }
    const byteLength = hex.length / 2;
    const uint8Array = new Uint8Array(byteLength);
    for (let i = 0; i < byteLength; i++) {
        const byteHex = hex.substr(i * 2, 2);
        uint8Array[i] = parseInt(byteHex, 16);
    }
    return uint8Array;
}
let WalletProvider = class WalletProvider extends AuthProviderAbstract {
    generateLink(params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!params.publicKey) {
                return;
            }
            const challenge = randomBytes(32).toString('hex');
            yield ioRedis.set(`wallet:${params.publicKey}`, challenge, 'EX', 60);
            return challenge;
        });
    }
    getToken(code) {
        return __awaiter(this, void 0, void 0, function* () {
            const { publicKey, challenge, signature } = JSON.parse(Buffer.from(code, 'base64').toString());
            if (!publicKey || !challenge || !signature) {
                return '';
            }
            const redisGet = yield ioRedis.get(`wallet:${publicKey}`);
            if (redisGet !== challenge) {
                return '';
            }
            const publicKeyUint8 = bs58.decode(publicKey);
            const messageUint8 = new TextEncoder().encode(challenge);
            const signatureUint8 = hexToUint8Array(signature);
            const isValid = nacl.sign.detached.verify(messageUint8, signatureUint8, publicKeyUint8);
            if (!isValid) {
                return '';
            }
            return code;
        });
    }
    getUser(providerToken) {
        return __awaiter(this, void 0, void 0, function* () {
            if ((yield this.getToken(providerToken)) === '') {
                return {
                    id: '',
                    email: '',
                };
            }
            const { publicKey } = JSON.parse(Buffer.from(providerToken, 'base64').toString());
            return {
                id: String(`wallet_${publicKey}`),
                email: String(`wallet_${publicKey}`),
            };
        });
    }
};
WalletProvider = __decorate([
    AuthProvider({ provider: 'WALLET' })
], WalletProvider);
export { WalletProvider };
//# sourceMappingURL=wallet.provider.js.map