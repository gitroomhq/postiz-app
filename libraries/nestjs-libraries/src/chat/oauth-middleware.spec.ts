import type * as http from 'node:http';

import type { MCPServerOAuthConfig } from './oauth-types';
import {
  createIntrospectionValidator,
  createOAuthMiddleware,
  createStaticTokenValidator,
} from './oauth-middleware';

const RESOURCE = 'https://api.example.test/mcp-oauth';

const config = (over: Partial<MCPServerOAuthConfig> = {}): MCPServerOAuthConfig => ({
  resource: RESOURCE,
  authorizationServers: ['https://auth.example.test'],
  ...over,
});

/** Captures what the middleware wrote, since it answers on the raw response. */
const response = () => {
  const captured = {
    status: 0,
    headers: {} as Record<string, string>,
    body: '',
  };

  const res = {
    writeHead: (status: number, headers?: Record<string, string>) => {
      captured.status = status;
      captured.headers = headers ?? {};
      return res;
    },
    end: (body?: string) => {
      captured.body = body ?? '';
      return res;
    },
  } as unknown as http.ServerResponse;

  return { res, captured, json: () => JSON.parse(captured.body || '{}') };
};

const call = (
  middleware: ReturnType<typeof createOAuthMiddleware>,
  path: string,
  init: { method?: string; authorization?: string } = {}
) => {
  const { res, captured, json } = response();
  const req = {
    method: init.method ?? 'GET',
    headers: init.authorization ? { authorization: init.authorization } : {},
  } as unknown as http.IncomingMessage;

  return middleware(req, res, new URL(path, RESOURCE)).then((result) => ({
    result,
    captured,
    json,
  }));
};

describe('createOAuthMiddleware protected resource metadata', () => {
  it('serves the metadata document at the well known path', async () => {
    const middleware = createOAuthMiddleware({ oauth: config() });

    const { result, captured, json } = await call(
      middleware,
      '/.well-known/oauth-protected-resource'
    );

    expect(result).toEqual({ proceed: false, handled: true });
    expect(captured.status).toBe(200);
    expect(captured.headers['Content-Type']).toBe('application/json');
    expect(json()).toMatchObject({
      resource: RESOURCE,
      authorization_servers: ['https://auth.example.test'],
      scopes_supported: ['mcp:read', 'mcp:write'],
      bearer_methods_supported: ['header'],
    });
  });

  it('carries the optional descriptive fields when configured', async () => {
    const middleware = createOAuthMiddleware({
      oauth: config({
        resourceName: 'Postiz MCP',
        resourceDocumentation: 'https://docs.example.test',
        scopesSupported: ['mcp:read'],
      }),
    });

    const { json } = await call(
      middleware,
      '/.well-known/oauth-protected-resource'
    );

    expect(json()).toMatchObject({
      resource_name: 'Postiz MCP',
      resource_documentation: 'https://docs.example.test',
      scopes_supported: ['mcp:read'],
    });
  });

  it('answers a cors preflight for the metadata endpoint', async () => {
    const middleware = createOAuthMiddleware({ oauth: config() });

    const { result, captured } = await call(
      middleware,
      '/.well-known/oauth-protected-resource',
      { method: 'OPTIONS' }
    );

    expect(result).toEqual({ proceed: false, handled: true });
    expect(captured.status).toBe(204);
    expect(captured.headers['Access-Control-Allow-Methods']).toContain('GET');
  });

  it('leaves any other path to the application', async () => {
    const middleware = createOAuthMiddleware({ oauth: config() });

    const { result } = await call(middleware, '/health');

    expect(result).toEqual({ proceed: true, handled: false });
  });
});

describe('createOAuthMiddleware token enforcement', () => {
  it('refuses an mcp request with no bearer token', async () => {
    const middleware = createOAuthMiddleware({ oauth: config() });

    const { result, captured, json } = await call(middleware, '/mcp');

    expect(result).toEqual({ proceed: false, handled: true });
    expect(captured.status).toBe(401);
    expect(json()).toEqual({
      error: 'unauthorized',
      error_description: 'Bearer token required',
    });
  });

  it('points the client at the metadata document it should read', async () => {
    const middleware = createOAuthMiddleware({ oauth: config() });

    const { captured } = await call(middleware, '/mcp');

    // RFC 9728 path-inserted form, so the root well-known can stay a 404
    expect(captured.headers['WWW-Authenticate']).toContain(
      'resource_metadata="https://api.example.test/.well-known/oauth-protected-resource/mcp-oauth"'
    );
  });

  it('rejects an authorization header that is not a bearer', async () => {
    const middleware = createOAuthMiddleware({ oauth: config() });

    const { captured } = await call(middleware, '/mcp', {
      authorization: 'Basic abc',
    });

    expect(captured.status).toBe(401);
  });

  it('accepts a token when no validator is configured', async () => {
    const middleware = createOAuthMiddleware({ oauth: config() });

    const { result } = await call(middleware, '/mcp', {
      authorization: 'Bearer anything',
    });

    expect(result).toEqual({
      proceed: true,
      handled: false,
      tokenValidation: { valid: true },
    });
  });

  it('lets a validated token through and passes the claims on', async () => {
    const middleware = createOAuthMiddleware({
      oauth: config({
        validateToken: async () => ({ valid: true, subject: 'user-1' }),
      }),
    });

    const { result } = await call(middleware, '/mcp', {
      authorization: 'Bearer good',
    });

    expect(result).toMatchObject({
      proceed: true,
      handled: false,
      tokenValidation: { valid: true, subject: 'user-1' },
    });
  });

  it('refuses a token the validator rejects, echoing the reason', async () => {
    const middleware = createOAuthMiddleware({
      oauth: config({
        validateToken: async () => ({
          valid: false,
          error: 'expired_token',
          errorDescription: 'The token expired',
        }),
      }),
    });

    const { result, captured, json } = await call(middleware, '/mcp', {
      authorization: 'Bearer stale',
    });

    expect(result.proceed).toBe(false);
    expect(captured.status).toBe(401);
    expect(captured.headers['WWW-Authenticate']).toContain('error="expired_token"');
    expect(json()).toEqual({
      error: 'expired_token',
      error_description: 'The token expired',
    });
  });

  it('falls back to invalid_token when the validator gives no reason', async () => {
    const middleware = createOAuthMiddleware({
      oauth: config({ validateToken: async () => ({ valid: false }) }),
    });

    const { json } = await call(middleware, '/mcp', {
      authorization: 'Bearer stale',
    });

    expect(json()).toEqual({
      error: 'invalid_token',
      error_description: 'Token validation failed',
    });
  });

  it('protects a configured path other than the default', async () => {
    const middleware = createOAuthMiddleware({
      oauth: config(),
      mcpPath: '/agent',
    });

    const { result: unprotected } = await call(middleware, '/mcp');
    expect(unprotected).toEqual({ proceed: true, handled: false });

    const { captured } = await call(middleware, '/agent/messages');
    expect(captured.status).toBe(401);
  });

  it('reports what it did to the logger', async () => {
    const debug = vi.fn();
    const middleware = createOAuthMiddleware({
      oauth: config(),
      logger: { debug },
    });

    await call(middleware, '/mcp');

    expect(debug).toHaveBeenCalledWith(expect.stringContaining('GET /mcp'));
  });
});

describe('createStaticTokenValidator', () => {
  it('accepts a listed token with the default scopes', async () => {
    const validate = createStaticTokenValidator(['tok-1'])!;

    await expect(validate('tok-1', RESOURCE)).resolves.toEqual({
      valid: true,
      scopes: ['mcp:read', 'mcp:write'],
    });
  });

  it('rejects anything not on the list', async () => {
    const validate = createStaticTokenValidator(['tok-1'])!;

    await expect(validate('tok-2', RESOURCE)).resolves.toMatchObject({
      valid: false,
      error: 'invalid_token',
    });
  });
});

describe('createIntrospectionValidator', () => {
  const ENDPOINT = 'https://auth.example.test/introspect';

  it('accepts an active token and maps its scopes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ active: true, scope: 'mcp:read mcp:write', sub: 'u1', exp: 99 })
      )
    );
    const validate = createIntrospectionValidator(ENDPOINT)!;

    await expect(validate('tok', RESOURCE)).resolves.toMatchObject({
      valid: true,
      scopes: ['mcp:read', 'mcp:write'],
      subject: 'u1',
      expiresAt: 99,
    });
  });

  it('rejects a token the server reports as inactive', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ active: false })));
    const validate = createIntrospectionValidator(ENDPOINT)!;

    await expect(validate('tok', RESOURCE)).resolves.toMatchObject({
      valid: false,
      error: 'invalid_token',
      errorDescription: 'Token is not active',
    });
  });

  it('refuses a token minted for a different resource', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ active: true, aud: 'https://someone-else.test' })
      )
    );
    const validate = createIntrospectionValidator(ENDPOINT)!;

    await expect(validate('tok', RESOURCE)).resolves.toMatchObject({
      valid: false,
      errorDescription: 'Token audience does not match this resource',
    });
  });

  it('accepts a token whose audience list includes this resource', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ active: true, aud: ['https://other.test', RESOURCE] })
      )
    );
    const validate = createIntrospectionValidator(ENDPOINT)!;

    await expect(validate('tok', RESOURCE)).resolves.toMatchObject({ valid: true });
  });

  it('sends basic credentials when the client is configured', async () => {
    const fetchSpy = vi.fn(
      async (_url: string, _init: RequestInit) => Response.json({ active: true })
    );
    vi.stubGlobal('fetch', fetchSpy);
    const validate = createIntrospectionValidator(ENDPOINT, {
      clientId: 'client',
      clientSecret: 'secret',
    })!;

    await validate('tok', RESOURCE);

    const [, init] = fetchSpy.mock.calls[0];
    expect((init.headers as Record<string, string>)['Authorization']).toBe(
      `Basic ${Buffer.from('client:secret').toString('base64')}`
    );
  });

  it('refuses a client id that would break basic auth framing', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const validate = createIntrospectionValidator(ENDPOINT, {
      clientId: 'client:with:colons',
      clientSecret: 'secret',
    })!;

    await expect(validate('tok', RESOURCE)).resolves.toMatchObject({
      valid: false,
      error: 'invalid_request',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports a non-ok introspection as a server error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 503 }))
    );
    const validate = createIntrospectionValidator(ENDPOINT)!;

    await expect(validate('tok', RESOURCE)).resolves.toMatchObject({
      valid: false,
      error: 'server_error',
      errorDescription: 'Introspection failed: 503',
    });
  });

  it('reports a network failure rather than throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('connect ECONNREFUSED');
      })
    );
    const validate = createIntrospectionValidator(ENDPOINT)!;

    await expect(validate('tok', RESOURCE)).resolves.toMatchObject({
      valid: false,
      error: 'server_error',
      errorDescription: 'connect ECONNREFUSED',
    });
  });

  it('treats a token with no scope string as having none', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ active: true })));
    const validate = createIntrospectionValidator(ENDPOINT)!;

    await expect(validate('tok', RESOURCE)).resolves.toMatchObject({ scopes: [] });
  });
});
