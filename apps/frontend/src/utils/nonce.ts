import crypto from 'crypto';

export function generateNonce() {
  return Buffer.from(crypto.randomBytes(16)).toString('base64');
}
