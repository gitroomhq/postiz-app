import { createHash } from 'crypto';

import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { OAuthService } from './oauth.service';

type Mocks = ReturnType<typeof mocks>;

const mocks = () => ({
  oauthRepository: {
    getAppByOrgId: vi.fn(async () => null as any),
    getAppByClientId: vi.fn(async () => null as any),
    createApp: vi.fn(async (_org: string, data: any) => ({ id: 'app-1', ...data })),
    updateApp: vi.fn(async (_org: string, data: any) => ({ id: 'app-1', ...data })),
    deleteApp: vi.fn(),
    revokeAllForApp: vi.fn(),
    updateClientSecret: vi.fn(),
    deleteStaleDynamicApps: vi.fn(async (_before: Date) => undefined),
    createDynamicApp: vi.fn(async (data: any) => ({
      id: 'app-dyn',
      createdAt: new Date('2024-05-01T00:00:00.000Z'),
      ...data,
    })),
    createAuthorization: vi.fn(async (_data: any) => undefined),
    findByCode: vi.fn(async () => null as any),
    exchangeCodeForToken: vi.fn(async () => ({
      organizationId: 'org-1',
      organization: { paymentId: 'cus_1' },
    })),
    findByAccessToken: vi.fn(async () => null as any),
    getApprovedApps: vi.fn(),
    revokeAuthorization: vi.fn(),
  },
});

const build = (over: Partial<Mocks> = {}) => {
  const m = { ...mocks(), ...over };
  const service = new OAuthService(m.oauthRepository as never);

  return { service, ...m };
};

const later = () => new Date(Date.now() + 60_000);

// An HttpException built from an object carries the detail on `response`,
// not on `message`, so matching the text needs the nested shape
const rejectsWith = (
  promise: Promise<unknown>,
  error: string,
  description?: RegExp
) =>
  expect(promise).rejects.toMatchObject({
    response: {
      error,
      ...(description
        ? { error_description: expect.stringMatching(description) }
        : {}),
    },
  });

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', 'test-secret');
  vi.stubEnv('DCR_VERIFIED_DOMAINS', '');
  vi.stubEnv('OPENAI_OAUTH_CLIENT_ID', '');
});

describe('OAuthService application management', () => {
  it('reports no application rather than throwing', async () => {
    const { service } = build();

    await expect(service.getApp('org-1')).resolves.toBe(false);
  });

  it('never returns the stored client secret with the application', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.getAppByOrgId.mockResolvedValue({
      id: 'app-1',
      name: 'App',
      clientId: 'pca_x',
      clientSecret: 'encrypted',
    });

    const app = await service.getApp('org-1');

    expect(app).toEqual({ id: 'app-1', name: 'App', clientId: 'pca_x' });
    expect(app).not.toHaveProperty('clientSecret');
  });

  it('allows only one application per organization', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.getAppByOrgId.mockResolvedValue({ id: 'app-1' });

    await expect(
      service.createApp('org-1', { name: 'App' } as never)
    ).rejects.toThrow(/only have one OAuth application/);
    expect(oauthRepository.createApp).not.toHaveBeenCalled();
  });

  it('stores the secret encrypted but returns it in the clear exactly once', async () => {
    const { service, oauthRepository } = build();

    const created = await service.createApp('org-1', {
      name: 'App',
      description: 'd',
      redirectUrl: 'https://app.example.com/cb',
    } as never);

    expect(created.clientId.startsWith('pca_')).toBe(true);
    expect(created.clientSecret.startsWith('pcs_')).toBe(true);

    const [, stored] = oauthRepository.createApp.mock.calls[0];
    expect(stored.clientSecret).not.toBe(created.clientSecret);
    expect(stored.clientSecret).toBe(
      AuthService.fixedEncryption(created.clientSecret)
    );
  });

  it('updates only the fields the caller supplied', async () => {
    const { service, oauthRepository } = build();

    await service.updateApp('org-1', { name: 'New name' } as never);

    expect(oauthRepository.updateApp).toHaveBeenCalledWith('org-1', {
      name: 'New name',
    });
  });

  it('lets an explicit empty description through but ignores an absent one', async () => {
    const { service, oauthRepository } = build();

    await service.updateApp('org-1', { description: '' } as never);
    expect(oauthRepository.updateApp).toHaveBeenLastCalledWith('org-1', {
      description: '',
    });

    await service.updateApp('org-1', {} as never);
    expect(oauthRepository.updateApp).toHaveBeenLastCalledWith('org-1', {});
  });

  it('refuses to delete an application that does not exist', async () => {
    const { service, oauthRepository } = build();

    await expect(service.deleteApp('org-1')).rejects.toThrow(
      /No OAuth app found/
    );
    expect(oauthRepository.deleteApp).not.toHaveBeenCalled();
  });

  it('revokes every authorization before removing the application', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.getAppByOrgId.mockResolvedValue({ id: 'app-1' });

    await expect(service.deleteApp('org-1')).resolves.toEqual({
      success: true,
    });
    expect(oauthRepository.revokeAllForApp).toHaveBeenCalledWith('app-1');
    expect(oauthRepository.deleteApp).toHaveBeenCalledWith('org-1');
  });

  it('refuses to rotate a secret for a missing application', async () => {
    const { service } = build();

    await expect(service.rotateSecret('org-1')).rejects.toThrow(
      /No OAuth app found/
    );
  });

  it('rotates to a fresh secret and stores it encrypted', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.getAppByOrgId.mockResolvedValue({ id: 'app-1' });

    const { clientSecret } = await service.rotateSecret('org-1');

    expect(clientSecret.startsWith('pcs_')).toBe(true);
    expect(oauthRepository.updateClientSecret).toHaveBeenCalledWith(
      'org-1',
      AuthService.fixedEncryption(clientSecret)
    );
  });

  it('lists and revokes user approvals', async () => {
    const { service, oauthRepository } = build();

    await service.getApprovedApps('u1');
    await expect(service.revokeApp('u1', 'auth-1')).resolves.toEqual({
      success: true,
    });

    expect(oauthRepository.getApprovedApps).toHaveBeenCalledWith('u1');
    expect(oauthRepository.revokeAuthorization).toHaveBeenCalledWith(
      'u1',
      'auth-1'
    );
  });
});

describe('OAuthService.registerDynamicClient redirect_uri rules', () => {
  const register = (uris: string[], extra: Record<string, unknown> = {}) =>
    ({ redirect_uris: uris, ...extra } as never);

  it('rejects a redirect_uri that is not a url at all', async () => {
    const { service } = build();

    await expect(
      service.registerDynamicClient(register(['not a url']))
    ).rejects.toMatchObject({
      response: { error: 'invalid_redirect_uri' },
    });
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,x',
    'blob:https://example.com/x',
    'file:///etc/passwd',
    'vbscript:msgbox',
    'about:blank',
  ])('refuses the browser-executable scheme %s', async (uri) => {
    const { service } = build();

    await rejectsWith(
      service.registerDynamicClient(register([uri])),
      'invalid_redirect_uri',
      /is not allowed/
    );
  });

  it('refuses plain http to a remote host', async () => {
    const { service } = build();

    await rejectsWith(
      service.registerDynamicClient(register(['http://example.com/cb'])),
      'invalid_redirect_uri',
      /must use https or a private-use scheme/
    );
  });

  it.each(['http://localhost:1234/cb', 'http://127.0.0.1:1234/cb', 'http://[::1]:1234/cb'])(
    'accepts the loopback callback %s',
    async (uri) => {
      const { service } = build();

      await expect(
        service.registerDynamicClient(register([uri]))
      ).resolves.toMatchObject({ redirect_uris: [uri] });
    }
  );

  it('accepts a private-use scheme from a native client', async () => {
    const { service } = build();

    await expect(
      service.registerDynamicClient(
        register(['cursor://anysphere.cursor-mcp/oauth/callback'])
      )
    ).resolves.toMatchObject({
      redirect_uris: ['cursor://anysphere.cursor-mcp/oauth/callback'],
    });
  });

  it('registers any https host when no verified domains are configured', async () => {
    const { service } = build();

    await expect(
      service.registerDynamicClient(register(['https://anything.example/cb']))
    ).resolves.toMatchObject({ client_id: expect.any(String) });
  });

  it('rejects an https host outside the verified domain list', async () => {
    const { service } = build();
    vi.stubEnv('DCR_VERIFIED_DOMAINS', 'trusted.com, other.com');

    await rejectsWith(
      service.registerDynamicClient(register(['https://evil.com/cb'])),
      'invalid_redirect_uri',
      /is not a verified domain/
    );
  });

  it('accepts an exact match and a subdomain of a verified domain', async () => {
    const { service } = build();
    vi.stubEnv('DCR_VERIFIED_DOMAINS', 'trusted.com');

    await expect(
      service.registerDynamicClient(register(['https://trusted.com/cb']))
    ).resolves.toMatchObject({ client_id: expect.any(String) });
    await expect(
      service.registerDynamicClient(register(['https://app.trusted.com/cb']))
    ).resolves.toMatchObject({ client_id: expect.any(String) });
  });

  it('does not treat a lookalike suffix as a verified subdomain', async () => {
    const { service } = build();
    vi.stubEnv('DCR_VERIFIED_DOMAINS', 'trusted.com');

    await rejectsWith(
      service.registerDynamicClient(register(['https://nottrusted.com/cb'])),
      'invalid_redirect_uri',
      /is not a verified domain/
    );
  });

  it('still holds a loopback callback exempt from the verified list', async () => {
    const { service } = build();
    vi.stubEnv('DCR_VERIFIED_DOMAINS', 'trusted.com');

    await expect(
      service.registerDynamicClient(register(['http://localhost:9000/cb']))
    ).resolves.toMatchObject({ client_id: expect.any(String) });
  });

  it('validates every redirect_uri, not just the first', async () => {
    const { service } = build();

    await rejectsWith(
      service.registerDynamicClient(
        register(['https://good.example/cb', 'http://bad.example/cb'])
      ),
      'invalid_redirect_uri',
      /must use https/
    );
  });

  it('trims whitespace around the submitted uris', async () => {
    const { service } = build();

    await expect(
      service.registerDynamicClient(register(['  https://a.example/cb  ']))
    ).resolves.toMatchObject({ redirect_uris: ['https://a.example/cb'] });
  });
});

describe('OAuthService.registerDynamicClient metadata', () => {
  const register = (extra: Record<string, unknown> = {}) =>
    ({ redirect_uris: ['https://a.example/cb'], ...extra } as never);

  it('supports only the authorization_code grant', async () => {
    const { service } = build();

    await rejectsWith(
      service.registerDynamicClient(
        register({ grant_types: ['client_credentials'] })
      ),
      'invalid_client_metadata',
      /Only the authorization_code grant type/
    );
  });

  it('accepts a grant list that includes authorization_code', async () => {
    const { service } = build();

    await expect(
      service.registerDynamicClient(
        register({ grant_types: ['authorization_code', 'refresh_token'] })
      )
    ).resolves.toMatchObject({ grant_types: ['authorization_code'] });
  });

  it('issues a secret to a confidential client', async () => {
    const { service, oauthRepository } = build();

    const result: any = await service.registerDynamicClient(register());

    expect(result.client_id.startsWith('pcd_')).toBe(true);
    expect(result.client_secret.startsWith('pcs_')).toBe(true);
    expect(result.client_secret_expires_at).toBe(0);
    expect(result.token_endpoint_auth_method).toBe('client_secret_post');

    const [stored] = oauthRepository.createDynamicApp.mock.calls[0];
    expect(stored.clientSecret).toBe(
      AuthService.fixedEncryption(result.client_secret)
    );
  });

  it('issues no secret to a public client', async () => {
    const { service, oauthRepository } = build();

    const result: any = await service.registerDynamicClient(
      register({ token_endpoint_auth_method: 'none' })
    );

    expect(result).not.toHaveProperty('client_secret');
    expect(result.token_endpoint_auth_method).toBe('none');

    const [stored] = oauthRepository.createDynamicApp.mock.calls[0];
    expect(stored.clientSecret).toBeUndefined();
  });

  it('names an unnamed client and caps a very long name', async () => {
    const { service, oauthRepository } = build();

    await service.registerDynamicClient(register());
    expect(oauthRepository.createDynamicApp.mock.calls[0][0].name).toBe(
      'MCP Client'
    );

    await service.registerDynamicClient(
      register({ client_name: '  ' + 'x'.repeat(150) + '  ' })
    );
    expect(oauthRepository.createDynamicApp.mock.calls[1][0].name).toHaveLength(
      100
    );
  });

  it('prunes clients that were registered but never authorized', async () => {
    const { service, oauthRepository } = build();

    await service.registerDynamicClient(register());

    const [before] = oauthRepository.deleteStaleDynamicApps.mock.calls[0];
    expect(before.getTime()).toBeLessThan(Date.now());
  });

  it('registers successfully even when the prune fails', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.deleteStaleDynamicApps.mockRejectedValue(
      new Error('database down')
    );

    await expect(
      service.registerDynamicClient(register())
    ).resolves.toMatchObject({ client_id: expect.any(String) });
  });

  it('reports the issue time in seconds', async () => {
    const { service } = build();

    await expect(service.registerDynamicClient(register())).resolves.toMatchObject(
      { client_id_issued_at: 1714521600 }
    );
  });
});

describe('OAuthService.validateAuthorizationRequest', () => {
  it('rejects an unknown client', async () => {
    const { service } = build();

    await expect(service.validateAuthorizationRequest('nope')).rejects.toThrow(
      /Invalid client_id/
    );
  });

  it('lets a statically registered app through without pkce', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.getAppByClientId.mockResolvedValue({
      id: 'app-1',
      dynamic: false,
    });

    await expect(
      service.validateAuthorizationRequest('pca_x')
    ).resolves.toMatchObject({ id: 'app-1' });
  });

  it('requires a dynamic client to use a registered redirect_uri', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.getAppByClientId.mockResolvedValue({
      id: 'app-1',
      dynamic: true,
      redirectUris: JSON.stringify(['https://a.example/cb']),
      tokenEndpointAuthMethod: 'client_secret_post',
    });

    await expect(
      service.validateAuthorizationRequest('pcd_x', {
        redirectUri: 'https://evil.example/cb',
      })
    ).rejects.toThrow(/Invalid redirect_uri/);
  });

  it('rejects a dynamic client that sends no redirect_uri', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.getAppByClientId.mockResolvedValue({
      id: 'app-1',
      dynamic: true,
      redirectUris: JSON.stringify(['https://a.example/cb']),
      tokenEndpointAuthMethod: 'client_secret_post',
    });

    await expect(
      service.validateAuthorizationRequest('pcd_x')
    ).rejects.toThrow(/Invalid redirect_uri/);
  });

  it('requires pkce from a public dynamic client', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.getAppByClientId.mockResolvedValue({
      id: 'app-1',
      dynamic: true,
      redirectUris: JSON.stringify(['https://a.example/cb']),
      tokenEndpointAuthMethod: 'none',
    });

    await expect(
      service.validateAuthorizationRequest('pcd_x', {
        redirectUri: 'https://a.example/cb',
      })
    ).rejects.toThrow(/code_challenge is required/);
  });

  it('supports only the S256 challenge method', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.getAppByClientId.mockResolvedValue({
      id: 'app-1',
      dynamic: true,
      redirectUris: JSON.stringify(['https://a.example/cb']),
      tokenEndpointAuthMethod: 'none',
    });

    await expect(
      service.validateAuthorizationRequest('pcd_x', {
        redirectUri: 'https://a.example/cb',
        codeChallenge: 'abc',
        codeChallengeMethod: 'plain',
      })
    ).rejects.toThrow(/Only the S256 code_challenge_method/);
  });

  it('accepts a well formed dynamic authorization request', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.getAppByClientId.mockResolvedValue({
      id: 'app-1',
      dynamic: true,
      redirectUris: JSON.stringify(['https://a.example/cb']),
      tokenEndpointAuthMethod: 'none',
    });

    await expect(
      service.validateAuthorizationRequest('pcd_x', {
        redirectUri: 'https://a.example/cb',
        codeChallenge: 'abc',
        codeChallengeMethod: 'S256',
      })
    ).resolves.toMatchObject({ id: 'app-1' });
  });
});

describe('OAuthService.createAuthorizationCode', () => {
  it('stores the code encrypted with a ten minute expiry', async () => {
    const { service, oauthRepository } = build();

    const code = await service.createAuthorizationCode('app-1', 'u1', 'org-1');

    const [stored] = oauthRepository.createAuthorization.mock.calls[0];
    expect(stored.authorizationCode).toBe(AuthService.fixedEncryption(code));
    expect(stored.authorizationCode).not.toBe(code);

    const ttl = stored.codeExpiresAt.getTime() - Date.now();
    expect(ttl).toBeGreaterThan(9 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(10 * 60 * 1000);
  });

  it('carries the pkce challenge and redirect_uri onto the authorization', async () => {
    const { service, oauthRepository } = build();

    await service.createAuthorizationCode('app-1', 'u1', 'org-1', {
      codeChallenge: 'chal',
      codeChallengeMethod: 'S256',
      redirectUri: 'https://a.example/cb',
    });

    expect(oauthRepository.createAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        oauthAppId: 'app-1',
        userId: 'u1',
        organizationId: 'org-1',
        codeChallenge: 'chal',
        codeChallengeMethod: 'S256',
        redirectUri: 'https://a.example/cb',
      })
    );
  });
});

describe('OAuthService.exchangeCodeForToken', () => {
  const confidential = () => ({
    id: 'app-1',
    dynamic: false,
    clientSecret: AuthService.fixedEncryption('pcs_right'),
  });

  const authFor = (over: Record<string, unknown> = {}) => ({
    id: 'auth-1',
    oauthAppId: 'app-1',
    codeExpiresAt: later(),
    codeChallenge: null,
    redirectUri: null,
    ...over,
  });

  it('rejects an unknown client', async () => {
    const { service } = build();

    await expect(
      service.exchangeCodeForToken('code', 'nope', 'pcs_right')
    ).rejects.toMatchObject({ response: { error: 'invalid_client' } });
  });

  it('rejects a wrong client secret', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.getAppByClientId.mockResolvedValue(confidential());

    await expect(
      service.exchangeCodeForToken('code', 'pca_x', 'pcs_wrong')
    ).rejects.toMatchObject({ response: { error: 'invalid_client' } });
  });

  it('rejects a missing client secret from a confidential client', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.getAppByClientId.mockResolvedValue(confidential());

    await expect(
      service.exchangeCodeForToken('code', 'pca_x')
    ).rejects.toMatchObject({ response: { error: 'invalid_client' } });
  });

  it('lets a public client authenticate with pkce instead of a secret', async () => {
    const { service, oauthRepository } = build();
    const verifier = 'a'.repeat(50);
    oauthRepository.getAppByClientId.mockResolvedValue({
      id: 'app-1',
      dynamic: true,
      tokenEndpointAuthMethod: 'none',
      clientSecret: null,
    });
    oauthRepository.findByCode.mockResolvedValue(
      authFor({
        codeChallenge: createHash('sha256').update(verifier).digest('base64url'),
      })
    );

    await expect(
      service.exchangeCodeForToken('code', 'pcd_x', undefined, verifier)
    ).resolves.toMatchObject({ token_type: 'bearer' });
  });

  it('rejects a code that does not exist', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.getAppByClientId.mockResolvedValue(confidential());

    await expect(
      service.exchangeCodeForToken('code', 'pca_x', 'pcs_right')
    ).rejects.toMatchObject({ response: { error: 'invalid_grant' } });
  });

  it('refuses a code issued to a different application', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.getAppByClientId.mockResolvedValue(confidential());
    oauthRepository.findByCode.mockResolvedValue(
      authFor({ oauthAppId: 'another-app' })
    );

    await expect(
      service.exchangeCodeForToken('code', 'pca_x', 'pcs_right')
    ).rejects.toMatchObject({ response: { error: 'invalid_grant' } });
  });

  it('refuses an expired code', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.getAppByClientId.mockResolvedValue(confidential());
    oauthRepository.findByCode.mockResolvedValue(
      authFor({ codeExpiresAt: new Date(Date.now() - 1000) })
    );

    await rejectsWith(
      service.exchangeCodeForToken('code', 'pca_x', 'pcs_right'),
      'invalid_grant',
      /Code has expired/
    );
  });

  it('requires the verifier when the code was bound to a challenge', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.getAppByClientId.mockResolvedValue(confidential());
    oauthRepository.findByCode.mockResolvedValue(
      authFor({ codeChallenge: 'chal' })
    );

    await rejectsWith(
      service.exchangeCodeForToken('code', 'pca_x', 'pcs_right'),
      'invalid_grant',
      /code_verifier is required/
    );
  });

  it('refuses a verifier that does not hash to the challenge', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.getAppByClientId.mockResolvedValue(confidential());
    oauthRepository.findByCode.mockResolvedValue(
      authFor({
        codeChallenge: createHash('sha256')
          .update('the-real-verifier')
          .digest('base64url'),
      })
    );

    await rejectsWith(
      service.exchangeCodeForToken('code', 'pca_x', 'pcs_right', 'guessed'),
      'invalid_grant',
      /Invalid code_verifier/
    );
  });

  it('refuses a redirect_uri that differs from the authorization request', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.getAppByClientId.mockResolvedValue(confidential());
    oauthRepository.findByCode.mockResolvedValue(
      authFor({ redirectUri: 'https://a.example/cb' })
    );

    await rejectsWith(
      service.exchangeCodeForToken(
        'code',
        'pca_x',
        'pcs_right',
        undefined,
        'https://evil.example/cb'
      ),
      'invalid_grant',
      /redirect_uri does not match/
    );
  });

  it('issues a bearer token and stores only its encrypted form', async () => {
    const { service, oauthRepository } = build();
    oauthRepository.getAppByClientId.mockResolvedValue(confidential());
    oauthRepository.findByCode.mockResolvedValue(authFor());

    const result = await service.exchangeCodeForToken(
      'code',
      'pca_x',
      'pcs_right'
    );

    expect(result).toEqual({
      id: 'org-1',
      cus: 'cus_1',
      access_token: expect.stringMatching(/^pos_/),
      token_type: 'bearer',
      scope: 'mcp:read mcp:write',
    });
    expect(oauthRepository.exchangeCodeForToken).toHaveBeenCalledWith(
      'auth-1',
      AuthService.fixedEncryption(result.access_token)
    );
  });

  it('adds the openid and email scopes only for the openai client', async () => {
    const { service, oauthRepository } = build();
    vi.stubEnv('OPENAI_OAUTH_CLIENT_ID', 'pca_openai');
    oauthRepository.getAppByClientId.mockResolvedValue(confidential());
    oauthRepository.findByCode.mockResolvedValue(authFor());

    await expect(
      service.exchangeCodeForToken('code', 'pca_openai', 'pcs_right')
    ).resolves.toMatchObject({ scope: 'openid email mcp:read mcp:write' });

    oauthRepository.findByCode.mockResolvedValue(authFor());
    await expect(
      service.exchangeCodeForToken('code', 'pca_other', 'pcs_right')
    ).resolves.toMatchObject({ scope: 'mcp:read mcp:write' });
  });
});

describe('OAuthService.getOrgByOAuthToken', () => {
  it('looks the token up by its encrypted form', async () => {
    const { service, oauthRepository } = build();

    await service.getOrgByOAuthToken('pos_plain');

    expect(oauthRepository.findByAccessToken).toHaveBeenCalledWith(
      AuthService.fixedEncryption('pos_plain')
    );
  });
});

describe('OAuthService.getUserInfo', () => {
  const record = {
    oauthApp: { clientId: 'pca_openai' },
    user: { id: 'u1', email: 'a@b.c', activated: true },
  };

  it('is switched off unless an openai client id is configured', async () => {
    const { service } = build();

    await expect(service.getUserInfo('Bearer x')).rejects.toMatchObject({
      response: { error: 'not_found' },
    });
  });

  it('requires a bearer token', async () => {
    const { service } = build();
    vi.stubEnv('OPENAI_OAUTH_CLIENT_ID', 'pca_openai');

    await expect(service.getUserInfo(undefined)).rejects.toMatchObject({
      response: { error: 'invalid_token' },
    });
    await expect(service.getUserInfo('Basic abc')).rejects.toMatchObject({
      response: { error: 'invalid_token' },
    });
  });

  it('rejects a token that is unknown or revoked', async () => {
    const { service } = build();
    vi.stubEnv('OPENAI_OAUTH_CLIENT_ID', 'pca_openai');

    await expect(service.getUserInfo('Bearer pos_x')).rejects.toMatchObject({
      response: { error: 'invalid_token' },
    });
  });

  it('refuses a client other than the configured openai one', async () => {
    const { service, oauthRepository } = build();
    vi.stubEnv('OPENAI_OAUTH_CLIENT_ID', 'pca_openai');
    oauthRepository.findByAccessToken.mockResolvedValue({
      ...record,
      oauthApp: { clientId: 'pca_someone_else' },
    });

    await expect(service.getUserInfo('Bearer pos_x')).rejects.toMatchObject({
      response: { error: 'insufficient_scope' },
    });
  });

  it('returns the oidc claims for the authorized client', async () => {
    const { service, oauthRepository } = build();
    vi.stubEnv('OPENAI_OAUTH_CLIENT_ID', 'pca_openai');
    oauthRepository.findByAccessToken.mockResolvedValue(record);

    await expect(service.getUserInfo('Bearer pos_x')).resolves.toEqual({
      sub: 'u1',
      email: 'a@b.c',
      email_verified: true,
    });
  });
});
