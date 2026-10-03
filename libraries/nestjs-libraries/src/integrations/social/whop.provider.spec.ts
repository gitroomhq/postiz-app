import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));
vi.mock('@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher', () => ({
  getSsrfSafeDispatcher: () => 'ssrf-dispatcher',
  ssrfSafeDispatcher: 'ssrf-dispatcher',
}));

import { createHash } from 'crypto';
import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { BadBody } from '../social.abstract';
import { WhopProvider } from './whop.provider';

const provider = new WhopProvider();
const integration = {} as never;

const post = (over: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: 'hello forum',
  settings: { experience: 'exp-1' },
  ...over,
});

const userinfo = () => ({
  sub: 'user-1',
  name: 'A Member',
  preferred_username: 'amember',
  picture: 'https://cdn.test/me.png',
});

beforeEach(() => {
  process.env.WHOP_CLIENT_ID = 'client-1';
  process.env.FRONTEND_URL = 'https://app.postiz.test';
});

describe('WhopProvider identity', () => {
  it('is a markdown editor with a long body limit', () => {
    expect(provider.identifier).toBe('whop');
    expect(provider.editor).toBe('markdown');
    expect(provider.maxLength()).toBe(50000);
  });
});

describe('WhopProvider.handleErrors', () => {
  it.each([
    ['invalid_grant', 'refresh-token'],
    ['insufficient_scope', 'refresh-token'],
    ['invalid_request', 'bad-body'],
    ['not_found', 'bad-body'],
  ])('classifies %s as %s', (body, type) => {
    expect(provider.handleErrors(body)?.type).toBe(type);
  });

  it('leaves anything else to the default handling', () => {
    expect(provider.handleErrors('server_error')).toBeUndefined();
  });
});

describe('WhopProvider.generateAuthUrl', () => {
  it('asks for the scopes it declares, space separated', async () => {
    const { url, state } = await provider.generateAuthUrl();
    const params = new URL(url).searchParams;

    expect(params.get('scope')!.split(' ')).toEqual(provider.scopes);
    expect(params.get('client_id')).toBe('client-1');
    expect(params.get('response_type')).toBe('code');
    expect(params.get('state')).toBe(state);
    expect(params.get('redirect_uri')).toBe(
      'https://app.postiz.test/integrations/social/whop'
    );
  });

  it('sends a PKCE challenge that really is the S256 hash of the verifier', async () => {
    const { url, codeVerifier } = await provider.generateAuthUrl();

    expect(new URL(url).searchParams.get('code_challenge')).toBe(
      createHash('sha256').update(codeVerifier).digest('base64url')
    );
    expect(new URL(url).searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('sends a nonce, which an OIDC provider requires', async () => {
    const { url } = await provider.generateAuthUrl();

    expect(new URL(url).searchParams.get('nonce')).toHaveLength(16);
  });

  it('issues a fresh state and verifier each time', async () => {
    const first = await provider.generateAuthUrl();
    const second = await provider.generateAuthUrl();

    expect(first.state).not.toBe(second.state);
    expect(first.codeVerifier).not.toBe(second.codeVerifier);
  });
});

describe('WhopProvider.authenticate', () => {
  const authRoutes = (token: Record<string, unknown> = {}) =>
    stubFetch([
      [
        '/oauth/token',
        () => ({
          access_token: 'access-1',
          refresh_token: 'refresh-1',
          expires_in: 7200,
          ...token,
        }),
      ],
      ['/oauth/userinfo', () => userinfo()],
    ]);

  it('exchanges the code with the PKCE verifier and describes the member', async () => {
    const fetchStub = authRoutes();

    await expect(
      provider.authenticate({ code: 'the-code', codeVerifier: 'verifier-1' })
    ).resolves.toEqual({
      id: 'user-1',
      name: 'A Member',
      username: 'amember',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 7200,
      picture: 'https://cdn.test/me.png',
    });

    expect(fetchStub.body('/oauth/token')).toMatchObject({
      grant_type: 'authorization_code',
      code: 'the-code',
      code_verifier: 'verifier-1',
      client_id: 'client-1',
      redirect_uri: 'https://app.postiz.test/integrations/social/whop',
    });
  });

  it('appends the refresh marker to the redirect when reconnecting', async () => {
    const fetchStub = authRoutes();

    await provider.authenticate({ code: 'c', codeVerifier: 'v', refresh: 'int-9' });

    expect(fetchStub.body('/oauth/token').redirect_uri).toBe(
      'https://app.postiz.test/integrations/social/whop?refresh=int-9'
    );
  });

  it('reports the description Whop gave rather than throwing', async () => {
    stubFetch([
      [
        '/oauth/token',
        () => ({ error: 'invalid_grant', error_description: 'Code already used' }),
      ],
    ]);

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v' })
    ).resolves.toBe('Authentication failed: Code already used');
  });

  it('falls back to the error code when there is no description', async () => {
    stubFetch([['/oauth/token', () => ({ error: 'invalid_grant' })]]);

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v' })
    ).resolves.toBe('Authentication failed: invalid_grant');
  });

  it('falls back to the username when the member has no display name', async () => {
    stubFetch([
      ['/oauth/token', () => ({ access_token: 'a', refresh_token: 'r', expires_in: 1 })],
      ['/oauth/userinfo', () => ({ sub: 'u', preferred_username: 'handle' })],
    ]);

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v' })
    ).resolves.toMatchObject({ name: 'handle', username: 'handle', picture: '' });
  });

  it('defaults the lifetime to an hour when Whop does not say', async () => {
    authRoutes({ expires_in: undefined });

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v' })
    ).resolves.toMatchObject({ expiresIn: 3600 });
  });
});

describe('WhopProvider.refreshToken', () => {
  it('trades the refresh token and re-reads the member', async () => {
    const fetchStub = stubFetch([
      [
        '/oauth/token',
        () => ({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 7200 }),
      ],
      ['/oauth/userinfo', () => userinfo()],
    ]);

    await expect(provider.refreshToken('old-refresh')).resolves.toMatchObject({
      id: 'user-1',
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 7200,
    });

    expect(fetchStub.body('/oauth/token')).toMatchObject({
      grant_type: 'refresh_token',
      refresh_token: 'old-refresh',
    });
  });
});

describe('WhopProvider.companies', () => {
  it('reduces the company list to id and title', async () => {
    const fetchStub = stubFetch([
      ['/api/v1/companies', () => ({ data: [{ id: 'c1', title: 'Acme' }] })],
    ]);

    await expect(provider.companies('token', {}, 'id')).resolves.toEqual([
      { id: 'c1', name: 'Acme' },
    ]);
    expect(fetchStub.calls[0].init.headers).toMatchObject({
      Authorization: 'Bearer token',
    });
  });

  it('returns an empty list when there are none', async () => {
    stubFetch([['/api/v1/companies', () => ({})]]);

    await expect(provider.companies('token', {}, 'id')).resolves.toEqual([]);
  });

  it('returns an empty list rather than throwing on a network failure', async () => {
    stubFetch([]);

    await expect(provider.companies('token', {}, 'id')).resolves.toEqual([]);
  });
});

describe('WhopProvider.experiences', () => {
  it('lists the forums of the chosen company by their experience', async () => {
    const fetchStub = stubFetch([
      [
        '/api/v1/forums',
        () => ({ data: [{ id: 'f1', experience: { id: 'exp-1', name: 'General' } }] }),
      ],
    ]);

    await expect(
      provider.experiences('token', { id: 'c1' }, 'id')
    ).resolves.toEqual([{ id: 'exp-1', name: 'General' }]);
    expect(fetchStub.urls()[0]).toContain('company_id=c1');
  });

  it('falls back to the forum id when it carries no experience', async () => {
    stubFetch([['/api/v1/forums', () => ({ data: [{ id: 'f1' }] })]]);

    await expect(
      provider.experiences('token', { id: 'c1' }, 'id')
    ).resolves.toEqual([{ id: 'f1', name: 'f1' }]);
  });

  it('asks nothing when no company was chosen', async () => {
    const fetchStub = stubFetch([]);

    await expect(provider.experiences('token', {}, 'id')).resolves.toEqual([]);
    expect(fetchStub.calls).toHaveLength(0);
  });

  it('returns an empty list rather than throwing on a network failure', async () => {
    stubFetch([]);

    await expect(
      provider.experiences('token', { id: 'c1' }, 'id')
    ).resolves.toEqual([]);
  });
});

describe('WhopProvider.post', () => {
  const forumRoute = () =>
    stubFetch([['/api/v1/forum_posts', () => ({ id: 'fp-1' })]]);

  it('creates the forum post and builds its permalink', async () => {
    const fetchStub = forumRoute();

    await expect(
      provider.post('id', 'token', [post() as never], integration)
    ).resolves.toEqual([
      {
        id: 'post-1',
        postId: 'fp-1',
        releaseURL: 'https://whop.com/experiences/exp-1/fp-1',
        status: 'success',
      },
    ]);

    expect(fetchStub.body('/api/v1/forum_posts')).toEqual({
      experience_id: 'exp-1',
      content: 'hello forum',
    });
  });

  it('includes a title when one was written', async () => {
    const fetchStub = forumRoute();

    await provider.post(
      'id',
      'token',
      [post({ settings: { experience: 'exp-1', title: 'A Title' } }) as never],
      integration
    );

    expect(fetchStub.body('/api/v1/forum_posts').title).toBe('A Title');
  });

  it('omits attachments entirely for a text-only post', async () => {
    const fetchStub = forumRoute();

    await provider.post('id', 'token', [post() as never], integration);

    expect(fetchStub.body('/api/v1/forum_posts')).not.toHaveProperty('attachments');
  });
});

describe('WhopProvider media upload', () => {
  const withMedia = () =>
    post({ media: [{ type: 'image', path: 'https://cdn.test/a.png' }] });

  const head = (over: Record<string, string> = {}) =>
    new Response(null, { headers: { 'content-length': '1024', ...over } });

  it('creates a file record, streams the bytes and waits for it to be ready', async () => {
    const fetchStub = stubFetch([
      [
        'https://cdn.test/a.png',
        ({ init }) => (init.method === 'HEAD' ? head() : new Response('bytes')),
      ],
      [
        /\/api\/v1\/files$/,
        () => ({ id: 'file-1', upload_url: 'https://s3.test/put', upload_headers: {} }),
      ],
      ['https://s3.test/put', () => new Response(null, { status: 200 })],
      [/\/api\/v1\/files\/file-1/, () => ({ upload_status: 'ready' })],
      ['/api/v1/forum_posts', () => ({ id: 'fp-1' })],
    ]);

    await provider.post('id', 'token', [withMedia() as never], integration);

    expect(fetchStub.body(/\/api\/v1\/files$/)).toEqual({ filename: 'a.png' });
    expect(fetchStub.body('/api/v1/forum_posts').attachments).toEqual([
      { id: 'file-1' },
    ]);
  });

  it('polls until the file leaves the pending state', async () => {
    let checks = 0;
    const fetchStub = stubFetch([
      [
        'https://cdn.test/a.png',
        ({ init }) => (init.method === 'HEAD' ? head() : new Response('bytes')),
      ],
      [/\/api\/v1\/files$/, () => ({ id: 'file-1', upload_url: 'https://s3.test/put' })],
      ['https://s3.test/put', () => new Response(null)],
      [
        /\/api\/v1\/files\/file-1/,
        () => ({ upload_status: checks++ < 2 ? 'pending' : 'ready' }),
      ],
      ['/api/v1/forum_posts', () => ({ id: 'fp-1' })],
    ]);

    await provider.post('id', 'token', [withMedia() as never], integration);

    expect(fetchStub.countTo(/\/api\/v1\/files\/file-1/)).toBe(3);
  });

  it('raises when Whop reports the upload failed', async () => {
    stubFetch([
      [
        'https://cdn.test/a.png',
        ({ init }) => (init.method === 'HEAD' ? head() : new Response('bytes')),
      ],
      [/\/api\/v1\/files$/, () => ({ id: 'file-1', upload_url: 'https://s3.test/put' })],
      ['https://s3.test/put', () => new Response(null)],
      [/\/api\/v1\/files\/file-1/, () => ({ upload_status: 'failed' })],
    ]);

    await expect(
      provider.post('id', 'token', [withMedia() as never], integration)
    ).rejects.toThrow('File upload failed');
  });

  it.each([
    ['the probe failed', new Response(null, { status: 404 })],
    ['the size is unknown', new Response(null)],
  ])('fails fast when %s, rather than letting Temporal retry', async (_label, response) => {
    stubFetch([['https://cdn.test/a.png', () => response]]);

    await expect(
      provider.post('id', 'token', [withMedia() as never], integration)
    ).rejects.toBeInstanceOf(BadBody);
  });

  it('fails rather than waiting nine minutes on a rejected PUT', async () => {
    stubFetch([
      [
        'https://cdn.test/a.png',
        ({ init }) => (init.method === 'HEAD' ? head() : new Response('bytes')),
      ],
      [/\/api\/v1\/files$/, () => ({ id: 'file-1', upload_url: 'https://s3.test/put' })],
      ['https://s3.test/put', () => new Response('denied', { status: 403 })],
    ]);

    await expect(
      provider.post('id', 'token', [withMedia() as never], integration)
    ).rejects.toBeInstanceOf(BadBody);
  });

  it('probes and downloads through the SSRF-safe dispatcher', async () => {
    const fetchStub = stubFetch([
      [
        'https://cdn.test/a.png',
        ({ init }) => (init.method === 'HEAD' ? head() : new Response('bytes')),
      ],
      [/\/api\/v1\/files$/, () => ({ id: 'file-1' })],
      ['/api/v1/forum_posts', () => ({ id: 'fp-1' })],
    ]);

    await provider.post('id', 'token', [withMedia() as never], integration);

    expect(fetchStub.calls[0].init).toMatchObject({ dispatcher: 'ssrf-dispatcher' });
  });

  it('attaches the file without uploading when Whop gives no upload url', async () => {
    const fetchStub = stubFetch([
      ['https://cdn.test/a.png', () => head()],
      [/\/api\/v1\/files$/, () => ({ id: 'file-1' })],
      ['/api/v1/forum_posts', () => ({ id: 'fp-1' })],
    ]);

    await provider.post('id', 'token', [withMedia() as never], integration);

    expect(fetchStub.body('/api/v1/forum_posts').attachments).toEqual([
      { id: 'file-1' },
    ]);
  });
});

describe('WhopProvider.comment', () => {
  const forumRoute = () =>
    stubFetch([['/api/v1/forum_posts', () => ({ id: 'fp-2' })]]);

  it('replies under the root post when there is no previous comment', async () => {
    const fetchStub = forumRoute();

    const [result] = await provider.comment(
      'id',
      'fp-1',
      undefined,
      'token',
      [post({ message: 'a reply' }) as never],
      integration
    );

    expect(fetchStub.body('/api/v1/forum_posts')).toEqual({
      experience_id: 'exp-1',
      content: 'a reply',
      parent_id: 'fp-1',
    });
    // The permalink points at the thread, not the reply.
    expect(result.releaseURL).toBe('https://whop.com/experiences/exp-1/fp-1');
  });

  it('chains onto the previous comment so the thread stays in order', async () => {
    const fetchStub = forumRoute();

    await provider.comment(
      'id',
      'fp-1',
      'fp-9',
      'token',
      [post() as never],
      integration
    );

    expect(fetchStub.body('/api/v1/forum_posts').parent_id).toBe('fp-9');
  });
});
