import { randomBytes } from 'crypto';

export const makeId = (length: number) => {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// Cryptographically secure token generator for security-sensitive use cases
// (e.g. OAuth `state` parameter). Do NOT use makeId() above for these cases:
// it relies on Math.random(), which is not safe against prediction/brute-force.
// Uses Node's native crypto module (no new dependency).
export const makeSecureState = () => {
  return randomBytes(32).toString('hex');
};
