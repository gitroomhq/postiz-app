import { ProvidersInterface } from '@gitroom/backend/services/auth/providers.interface';

export class AuthentikProvider implements ProvidersInterface {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly frontendUrl: string;

  constructor() {
    const {
      AUTHENTIK_URL,
      AUTHENTIK_CLIENT_ID,
      AUTHENTIK_CLIENT_SECRET,
      FRONTEND_URL,
    } = process.env;

    if (!AUTHENTIK_URL)
      throw new Error('AUTHENTIK_URL environment variable is not set');
    if (!AUTHENTIK_CLIENT_ID)
      throw new Error('AUTHENTIK_CLIENT_ID environment variable is not set');
    if (!AUTHENTIK_CLIENT_SECRET)
      throw new Error(
        'AUTHENTIK_CLIENT_SECRET environment variable is not set'
      );
    if (!FRONTEND_URL)
      throw new Error('FRONTEND_URL environment variable is not set');

    this.baseUrl = AUTHENTIK_URL.endsWith('/')
      ? AUTHENTIK_URL.slice(0, -1)
      : AUTHENTIK_URL;
    this.clientId = AUTHENTIK_CLIENT_ID;
    this.clientSecret = AUTHENTIK_CLIENT_SECRET;
    this.frontendUrl = FRONTEND_URL;
  }

  generateLink(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: 'openid profile email',
      response_type: 'code',
      redirect_uri: `${this.frontendUrl}/settings`,
    });

    return `${this.baseUrl}/application/o/authorize/?${params.toString()}`;
  }

  async getToken(code: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/application/o/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: `${this.frontendUrl}/settings`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token request failed: ${error}`);
    }

    const { access_token } = await response.json();
    return access_token;
  }

  async getUser(access_token: string): Promise<{ email: string; id: string }> {
    const response = await fetch(`${this.baseUrl}/application/o/userinfo/`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`User info request failed: ${error}`);
    }

    const { email, sub: id } = await response.json();
    return { email, id };
  }
}
