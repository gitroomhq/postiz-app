import { ProvidersInterface } from '@gitroom/backend/services/auth/providers.interface';
import { randomBytes } from 'crypto';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

function hexToUint8Array(hex) {
  // Remove any potential "0x" prefix
  if (hex.startsWith('0x')) {
    hex = hex.slice(2);
  }

  // Ensure the hex string has an even length
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string. It must have an even length.');
  }

  const byteLength = hex.length / 2;
  const uint8Array = new Uint8Array(byteLength);

  for (let i = 0; i < byteLength; i++) {
    // Get two characters from the hex string
    const byteHex = hex.substr(i * 2, 2);
    // Parse the two characters as a hexadecimal number
    uint8Array[i] = parseInt(byteHex, 16);
  }

  return uint8Array;
}

export class WalletProvider implements ProvidersInterface {
  async generateLink(params: { publicKey: string }) {
    if (!params.publicKey) {
      return;
    }

    const challenge = randomBytes(32).toString('hex');
    await ioRedis.set(`wallet:${params.publicKey}`, challenge, 'EX', 60);

    return challenge;
  }

  async getToken(code: string) {
    const { publicKey, challenge, signature } = JSON.parse(
      Buffer.from(code, 'base64').toString()
    );

    if (!publicKey || !challenge || !signature) {
      return '';
    }

    const redisGet = await ioRedis.get(`wallet:${publicKey}`);
    if (redisGet !== challenge) {
      return '';
    }

    const publicKeyUint8 = bs58.decode(publicKey);
    const messageUint8 = new TextEncoder().encode(challenge);
    const signatureUint8 = hexToUint8Array(signature);
    const isValid = nacl.sign.detached.verify(
      messageUint8,
      signatureUint8,
      publicKeyUint8
    );

    if (!isValid) {
      return '';
    }

    return code;
  }

  async getUser(providerToken: string) {
    if ((await this.getToken(providerToken)) === '') {
      return {
        id: '',
        email: '',
      };
    }

    const { publicKey } = JSON.parse(
      Buffer.from(providerToken, 'base64').toString()
    );

    return {
      id: String(`wallet_${publicKey}`),
      email: String(`wallet_${publicKey}`),
    };
  }
}
