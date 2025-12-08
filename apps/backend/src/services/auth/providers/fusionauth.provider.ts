import { ProvidersInterface } from '@gitroom/backend/services/auth/providers.interface';

export class FusionAuthProvider implements ProvidersInterface {
  private issuer = process.env.FUSION_AUTH_BASE_URL!;
  private clientId = process.env.FUSION_AUTH_CLIENT_ID!;
  private clientSecret = process.env.FUSION_AUTH_CLIENT_SECRET;
  private redirectUri =
    process.env.FUSION_AUTH_REDIRECT_URI || `${process.env.FRONTEND_URL}/auth/sso/fusionauth`;

  generateLink() {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: 'openid profile email',
      redirect_uri: `${process.env.FRONTEND_URL}/settings`,
    });

    return `${this.issuer}/oauth2/authorize?${params.toString()}`;
  }

  async getToken(codeOrToken: string): Promise<string> {
    if (!this.clientSecret) {
      throw new Error('FusionAuth client secret is not configured');
    }

    const headers: Record<string, string> = {
      'content-type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
    };

    const res = await fetch(`${this.issuer}/oauth2/token`, {
      method: 'POST',
      headers,
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        code: codeOrToken,
      }).toString(),
    });

    if (!res.ok) {
      throw new Error(`Token exchange failed: ${await res.text()}`);
    }
    const json = await res.json();
    return json.access_token || json.id_token || '';
  }

  async getUser(tokenOrIdToken: string): Promise<{ email: string; id: string }> {
    const res = await fetch(`${this.issuer}/oauth2/userinfo`, {
      headers: { Authorization: `Bearer ${tokenOrIdToken}`, Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error('Failed to fetch userinfo');
    }
    const data = await res.json();
    return { id: String(data.sub), email: data.email };
  }
}
