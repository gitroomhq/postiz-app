import { sign, verify } from 'jsonwebtoken';
import { hashSync, compareSync } from 'bcrypt';
import crypto from 'crypto';
// @ts-ignore
import EVP_BytesToKey from 'evp_bytestokey';
const algorithm = 'aes-256-cbc';
const { keyLength, ivLength } = crypto.getCipherInfo(algorithm);
function deriveLegacyKeyIv(secret) {
    const { keyLength, ivLength } = crypto.getCipherInfo(algorithm); // 32, 16
    const pass = Buffer.isBuffer(secret) ? secret : Buffer.from(secret !== null && secret !== void 0 ? secret : '', 'utf8');
    // evp_bytestokey: key length in **bits**, IV length in **bytes**
    const { key, iv } = EVP_BytesToKey(pass, null, keyLength * 8, ivLength, 'md5');
    if (key.length !== keyLength || iv.length !== ivLength) {
        throw new Error(`Derived wrong sizes (key=${key.length}, iv=${iv.length})`);
    }
    return { key, iv };
}
export function decrypt_legacy_using_IV(hexCiphertext) {
    const { key, iv } = deriveLegacyKeyIv(process.env.JWT_SECRET);
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    const out = Buffer.concat([decipher.update(hexCiphertext, 'hex'), decipher.final()]);
    return out.toString('utf8');
}
export function encrypt_legacy_using_IV(utf8Plaintext) {
    const { key, iv } = deriveLegacyKeyIv(process.env.JWT_SECRET);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const out = Buffer.concat([cipher.update(utf8Plaintext, 'utf8'), cipher.final()]);
    return out.toString('hex');
}
export class AuthService {
    static hashPassword(password) {
        return hashSync(password, 10);
    }
    static comparePassword(password, hash) {
        return compareSync(password, hash);
    }
    static signJWT(value) {
        return sign(value, process.env.JWT_SECRET);
    }
    static verifyJWT(token) {
        return verify(token, process.env.JWT_SECRET);
    }
    static fixedEncryption(value) {
        return encrypt_legacy_using_IV(value);
    }
    static fixedDecryption(hash) {
        return decrypt_legacy_using_IV(hash);
    }
}
//# sourceMappingURL=auth.service.js.map