import { randomInt } from 'crypto';

// Same alphabet and shape as makeId, but every character comes from the
// OS entropy pool instead of Math.random. Use this for anything that acts
// as a credential: tokens, secrets, api keys, oauth state and PKCE verifiers.
// makeId stays as it is because it is also imported by the frontend and by
// Temporal workflow files, where the crypto module is not available.
export const makeSecureId = (length: number) => {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i += 1) {
    text += possible.charAt(randomInt(possible.length));
  }
  return text;
};
