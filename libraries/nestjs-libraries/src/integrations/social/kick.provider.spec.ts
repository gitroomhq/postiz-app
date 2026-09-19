import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { createHash } from 'crypto';
import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { KickProvider } from './kick.provider';

const provider = new KickProvider();
const integration = { profile: 'mychannel' } as never;

const post = (over: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: 'hello chat',
  settings: {},
  ...over,
});

const user = () => ({
  data: [{ user_id: 77, name: 'A Streamer', profile_picture: 'https://cdn.test/me.png' }],
});

beforeEach(() => {
  process.env.KICK_CLIENT_ID = 'client-1';
  process.env.KICK_SECRET = 'secret-1';
  process.env.FRONTEND_URL = 'https://app.postiz.test';
});

describe('KickProvider identity', () => {
  it('caps a message at the Kick chat limit', () => {
    expect(provider.identifier).toBe('kick');
    expect(provider.maxLength()).toBe(500);
    expect(provider.editor).toBe('normal');
  });
});

describe('KickProvider.generateAuthUrl', () => {
  it('asks for the scopes it declares, space separated', async () => {
    const { url, state } = await provider.generateAuthUrl();
    const params = new URL(url).searchParams;

    expect(params.get('scope')!.split(' ')).toEqual(provider.scopes);
    expect(params.get('client_id')).toBe('client-1');
    expect(params.get('response_type')).toBe('code');
    expect(params.get('state')).toBe(state);
    expect(params.get('redirect_uri')).toBe(
      'https://app.postiz.test/integrations/social/kick'
    );
  });

  it('sends a PKCE challenge that really is the S256 hash of the verifier', async () => {
    // Kick rejects the exchange if the challenge does not match, so getting the
    // base64url conversion wrong breaks every connect.
    const { url, codeVerifier } = await provider.generateAuthUrl();
    const params = new URL(url).searchParams;

    const expected = createHash('sha256')
      .update(codeVerifier)
      .digest('base64')
      .replace(/=*$/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    expect(params.get('code_challenge')).toBe(expected);
    expect(params.get('code_challenge_method')).toBe('S256');
  });

  it('never emits base64 padding or unsafe characters in the challenge', async () => {
    for (let i = 0; i < 5; i++) {
      const { url } = await provider.generateAuthUrl();
      const challenge = new URL(url).searchParams.get('code_challenge')!;

      expect(challenge).not.toContain('=');
      expect(challenge).not.toContain('+');
      expect(challenge).not.toContain('/');
    }
  });

  it('issues a fresh state and verifier each time', async () => {
    const first = await provider.generateAuthUrl();
    const second = await provider.generateAuthUrl();

    expect(first.state).not.toBe(second.state);
    expect(first.codeVerifier).not.toBe(second.codeVerifier);
    expect(first.state).toHaveLength(32);
  });
});

describe('KickProvider.authenticate', () => {
  const authRoutes = () =>
    stubFetch([
      [
        'id.kick.com/oauth/token',
        () => ({ access_token: 'access-1', refresh_token: 'refresh-1', expires_in: 7200 }),
      ],
      ['api.kick.com/public/v1/users', () => user()],
    ]);

  it('exchanges the code with the PKCE verifier and describes the channel', async () => {
    const fetchStub = authRoutes();

    await expect(
      provider.authenticate({ code: 'the-code', codeVerifier: 'verifier-1' })
    ).resolves.toEqual({
      id: '77',
      name: 'A Streamer',
      username: 'A Streamer',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 7200,
      picture: 'https://cdn.test/me.png',
    });

    const body = new URLSearchParams(String(fetchStub.calls[0].init.body));
    expect(Object.fromEntries(body)).toMatchObject({
      grant_type: 'authorization_code',
      code: 'the-code',
      code_verifier: 'verifier-1',
      client_id: 'client-1',
      client_secret: 'secret-1',
      redirect_uri: 'https://app.postiz.test/integrations/social/kick',
    });
  });

  it('appends the refresh marker to the redirect when reconnecting', async () => {
    const fetchStub = authRoutes();

    await provider.authenticate({ code: 'c', codeVerifier: 'v', refresh: 'int-9' });

    const body = new URLSearchParams(String(fetchStub.calls[0].init.body));
    expect(body.get('redirect_uri')).toBe(
      'https://app.postiz.test/integrations/social/kick?refresh=int-9'
    );
  });

  it('reads the user through the freshly issued token', async () => {
    const fetchStub = authRoutes();

    await provider.authenticate({ code: 'c', codeVerifier: 'v' });

    expect(fetchStub.calls[1].init.headers).toMatchObject({
      Authorization: 'Bearer access-1',
    });
  });

  it('accepts a user payload that is an object rather than a list', async () => {
    // The endpoint has answered both ways; taking only data[0] would break.
    stubFetch([
      ['id.kick.com/oauth/token', () => ({ access_token: 'a', refresh_token: 'r', expires_in: 1 })],
      ['api.kick.com/public/v1/users', () => ({ data: { id: 5, name: 'Solo' } })],
    ]);

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v' })
    ).resolves.toMatchObject({ id: '5', name: 'Solo', picture: '' });
  });

  it('prefers user_id over id, because the public api returns both', async () => {
    stubFetch([
      ['id.kick.com/oauth/token', () => ({ access_token: 'a', refresh_token: 'r', expires_in: 1 })],
      ['api.kick.com/public/v1/users', () => ({ data: [{ user_id: 77, id: 99, name: 'X' }] })],
    ]);

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v' })
    ).resolves.toMatchObject({ id: '77' });
  });
});

describe('KickProvider.refreshToken', () => {
  it('trades the refresh token and re-reads the channel', async () => {
    const fetchStub = stubFetch([
      [
        'id.kick.com/oauth/token',
        () => ({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 7200 }),
      ],
      ['api.kick.com/public/v1/users', () => user()],
    ]);

    await expect(provider.refreshToken('old-refresh')).resolves.toMatchObject({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 7200,
      id: '77',
    });

    const body = new URLSearchParams(String(fetchStub.calls[0].init.body));
    expect(Object.fromEntries(body)).toMatchObject({
      grant_type: 'refresh_token',
      refresh_token: 'old-refresh',
    });
  });
});

describe('KickProvider.post', () => {
  const chatRoute = (over: Record<string, unknown> = {}) =>
    stubFetch([
      ['/public/v1/chat', () => ({ data: { message_id: 'msg-1', is_sent: true }, ...over })],
    ]);

  it('sends the message to the broadcaster channel', async () => {
    const fetchStub = chatRoute();

    await expect(
      provider.post('77', 'token', [post() as never], integration)
    ).resolves.toEqual([
      {
        id: 'post-1',
        postId: 'msg-1',
        releaseURL: 'https://kick.com/mychannel',
        status: 'posted',
      },
    ]);

    expect(fetchStub.body('/public/v1/chat')).toEqual({
      type: 'user',
      content: 'hello chat',
      broadcaster_user_id: 77,
    });
  });

  it('truncates to the chat limit rather than letting Kick reject it', async () => {
    const fetchStub = chatRoute();

    await provider.post(
      '77',
      'token',
      [post({ message: 'a'.repeat(800) }) as never],
      integration
    );

    expect(fetchStub.body('/public/v1/chat').content).toHaveLength(500);
  });

  it('sends the broadcaster id as a number, not the string it was given', async () => {
    const fetchStub = chatRoute();

    await provider.post('77', 'token', [post() as never], integration);

    expect(typeof fetchStub.body('/public/v1/chat').broadcaster_user_id).toBe('number');
  });

  it('reports an error status when Kick says the message was not sent', async () => {
    stubFetch([['/public/v1/chat', () => ({ data: { message_id: 'm', is_sent: false } })]]);

    const [result] = await provider.post('77', 'token', [post() as never], integration);

    expect(result.status).toBe('error');
  });

  it('reads a flat response shape too', async () => {
    stubFetch([['/public/v1/chat', () => ({ message_id: 'flat-1', is_sent: true })]]);

    const [result] = await provider.post('77', 'token', [post() as never], integration);

    expect(result).toMatchObject({ postId: 'flat-1', status: 'posted' });
  });

  it('invents an id when Kick returns none, so the post is still recorded', async () => {
    stubFetch([['/public/v1/chat', () => ({ data: { is_sent: true } })]]);

    const [result] = await provider.post('77', 'token', [post() as never], integration);

    expect(result.postId).toHaveLength(10);
  });

  it('falls back to a generic channel url when the profile is unknown', async () => {
    chatRoute();

    const [result] = await provider.post('77', 'token', [post() as never], {} as never);

    expect(result.releaseURL).toBe('https://kick.com/channel');
  });
});

describe('KickProvider.comment', () => {
  const chatRoute = () =>
    stubFetch([
      ['/public/v1/chat', () => ({ data: { message_id: 'msg-2', is_sent: true } })],
    ]);

  it('replies to the root message when there is no previous comment', async () => {
    const fetchStub = chatRoute();

    await provider.comment(
      '77',
      'msg-1',
      undefined,
      'token',
      [post({ id: 'c-1', message: 'a reply' }) as never],
      integration
    );

    expect(fetchStub.body('/public/v1/chat')).toMatchObject({
      content: 'a reply',
      reply_to_message_id: 'msg-1',
    });
  });

  it('chains onto the previous comment so the thread stays in order', async () => {
    const fetchStub = chatRoute();

    await provider.comment(
      '77',
      'msg-1',
      'msg-9',
      'token',
      [post({ id: 'c-2' }) as never],
      integration
    );

    expect(fetchStub.body('/public/v1/chat').reply_to_message_id).toBe('msg-9');
  });

  it('truncates a comment to the chat limit too', async () => {
    const fetchStub = chatRoute();

    await provider.comment(
      '77',
      'msg-1',
      undefined,
      'token',
      [post({ message: 'b'.repeat(900) }) as never],
      integration
    );

    expect(fetchStub.body('/public/v1/chat').content).toHaveLength(500);
  });

  it('reports an error status when the reply was not sent', async () => {
    stubFetch([['/public/v1/chat', () => ({ data: { is_sent: false } })]]);

    const [result] = await provider.comment(
      '77',
      'msg-1',
      undefined,
      'token',
      [post() as never],
      integration
    );

    expect(result.status).toBe('error');
  });
});
