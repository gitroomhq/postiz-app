import { decode, sign, verify } from 'jsonwebtoken';
import { createPublicKey } from 'crypto';
import {
  AuthProvider,
  AuthProviderAbstract,
} from '@gitroom/backend/services/auth/providers.interface';

const getConfig = () => {
  const { APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY } =
    process.env;

  if (
    !APPLE_CLIENT_ID ||
    !APPLE_TEAM_ID ||
    !APPLE_KEY_ID ||
    !APPLE_PRIVATE_KEY
  ) {
    throw new Error('APPLE environment variables are not set');
  }

  return {
    clientId: APPLE_CLIENT_ID,
    teamId: APPLE_TEAM_ID,
    keyId: APPLE_KEY_ID,
    privateKey: APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
};

const defaultRedirect = () =>
  `${
    process?.env?.NEXT_PUBLIC_BACKEND_URL?.indexOf('https') === -1
      ? 'https://redirectmeto.com/'
      : ''
  }${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/oauth/apple/redirect`;

const clientSecret = () => {
  const { clientId, teamId, keyId, privateKey } = getConfig();
  return sign({}, privateKey, {
    algorithm: 'ES256',
    expiresIn: '5m',
    audience: 'https://appleid.apple.com',
    issuer: teamId,
    subject: clientId,
    keyid: keyId,
  });
};

@AuthProvider({ provider: 'APPLE' })
export class AppleProvider extends AuthProviderAbstract {
  generateLink(query?: { redirect_uri?: string; state?: string }) {
    const { clientId } = getConfig();
    const url = new URL('https://appleid.apple.com/auth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set(
      'redirect_uri',
      query?.redirect_uri || defaultRedirect()
    );
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('response_mode', 'form_post');
    url.searchParams.set('scope', 'name email');
    url.searchParams.set('state', query?.state || 'login');
    return url.toString();
  }

  async getToken(code: string, redirectUri?: string): Promise<string> {
    const { clientId } = getConfig();
    const response = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri || defaultRedirect(),
        client_id: clientId,
        client_secret: clientSecret(),
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token request failed: ${error}`);
    }

    const { id_token } = await response.json();
    if (!id_token) {
      throw new Error('Invalid provider token');
    }

    return id_token;
  }

  async getUser(providerToken: string) {
    const { clientId } = getConfig();
    const decoded = decode(providerToken, { complete: true });
    const { keys } = await (
      await fetch('https://appleid.apple.com/auth/keys')
    ).json();

    const key = keys.find(
      (k: { kid: string }) => k.kid === decoded?.header?.kid
    );
    if (!key) {
      throw new Error('Invalid provider token');
    }

    // the id_token must be verified against Apple's public keys because it is
    // sent back from the client as the providerToken during registration
    const payload = verify(
      providerToken,
      createPublicKey({ key, format: 'jwk' }),
      {
        algorithms: ['RS256'],
        audience: clientId,
        issuer: 'https://appleid.apple.com',
      }
    ) as { sub: string; email: string };

    return {
      id: payload.sub,
      email: payload.email,
    };
  }
}
