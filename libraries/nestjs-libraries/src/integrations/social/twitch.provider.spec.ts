import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { TwitchProvider } from './twitch.provider';

const provider = new TwitchProvider();
const integration = { profile: 'mychannel', providerIdentifier: 'twitch' } as never;

const post = (over: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: 'hello chat',
  settings: {},
  ...over,
});

const user = () => ({
  data: [
    {
      id: 77,
      display_name: 'A Streamer',
      login: 'astreamer',
      profile_image_url: 'https://cdn.test/me.png',
    },
  ],
});

const chatRoute = (isSent = true) =>
  stubFetch([
    ['/helix/chat/announcements', () => new Response(null, { status: 204 })],
    [
      '/helix/chat/messages',
      () => ({ data: [{ message_id: 'msg-1', is_sent: isSent }] }),
    ],
  ]);

beforeEach(() => {
  process.env.TWITCH_CLIENT_ID = 'client-1';
  process.env.TWITCH_CLIENT_SECRET = 'secret-1';
  process.env.FRONTEND_URL = 'https://app.postiz.test';
});

describe('TwitchProvider identity', () => {
  it('caps a message at the Twitch chat limit', () => {
    expect(provider.identifier).toBe('twitch');
    expect(provider.maxLength()).toBe(500);
    expect(provider.editor).toBe('normal');
  });

  it('publishes one at a time, because chat is rate limited hard', () => {
    expect(provider.maxConcurrentJob).toBe(1);
  });
});

describe('TwitchProvider.generateAuthUrl', () => {
  it('asks for the scopes it declares, space separated', async () => {
    const { url, state } = await provider.generateAuthUrl();
    const params = new URL(url).searchParams;

    expect(params.get('scope')!.split(' ')).toEqual(provider.scopes);
    expect(params.get('client_id')).toBe('client-1');
    expect(params.get('response_type')).toBe('code');
    expect(params.get('state')).toBe(state);
    expect(params.get('redirect_uri')).toBe(
      'https://app.postiz.test/integrations/social/twitch'
    );
    expect(state).toHaveLength(32);
  });
});

describe('TwitchProvider.authenticate', () => {
  const authRoutes = () =>
    stubFetch([
      [
        'id.twitch.tv/oauth2/token',
        () => ({ access_token: 'access-1', refresh_token: 'refresh-1', expires_in: 14400 }),
      ],
      ['api.twitch.tv/helix/users', () => user()],
    ]);

  it('exchanges the code and describes the channel', async () => {
    const fetchStub = authRoutes();

    await expect(
      provider.authenticate({ code: 'the-code', codeVerifier: 'v' })
    ).resolves.toEqual({
      id: '77',
      name: 'A Streamer',
      username: 'astreamer',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 14400,
      picture: 'https://cdn.test/me.png',
    });

    const body = new URLSearchParams(String(fetchStub.calls[0].init.body));
    expect(Object.fromEntries(body)).toMatchObject({
      grant_type: 'authorization_code',
      code: 'the-code',
      client_id: 'client-1',
      client_secret: 'secret-1',
      redirect_uri: 'https://app.postiz.test/integrations/social/twitch',
    });
  });

  it('appends the refresh marker to the redirect when reconnecting', async () => {
    const fetchStub = authRoutes();

    await provider.authenticate({ code: 'c', codeVerifier: 'v', refresh: 'int-9' });

    const body = new URLSearchParams(String(fetchStub.calls[0].init.body));
    expect(body.get('redirect_uri')).toBe(
      'https://app.postiz.test/integrations/social/twitch?refresh=int-9'
    );
  });

  it('sends the Client-Id header Twitch requires on every helix call', async () => {
    const fetchStub = authRoutes();

    await provider.authenticate({ code: 'c', codeVerifier: 'v' });

    expect(fetchStub.calls[1].init.headers).toMatchObject({
      Authorization: 'Bearer access-1',
      'Client-Id': 'client-1',
    });
  });

  it('falls back to an empty picture when the account has no avatar', async () => {
    stubFetch([
      ['id.twitch.tv/oauth2/token', () => ({ access_token: 'a', refresh_token: 'r', expires_in: 1 })],
      ['api.twitch.tv/helix/users', () => ({ data: [{ id: 1, display_name: 'X', login: 'x' }] })],
    ]);

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v' })
    ).resolves.toMatchObject({ picture: '' });
  });
});

describe('TwitchProvider.refreshToken', () => {
  it('trades the refresh token and re-reads the channel', async () => {
    const fetchStub = stubFetch([
      [
        'id.twitch.tv/oauth2/token',
        () => ({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 14400 }),
      ],
      ['api.twitch.tv/helix/users', () => user()],
    ]);

    await expect(provider.refreshToken('old-refresh')).resolves.toMatchObject({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 14400,
      id: '77',
    });

    const body = new URLSearchParams(String(fetchStub.calls[0].init.body));
    expect(Object.fromEntries(body)).toMatchObject({
      grant_type: 'refresh_token',
      refresh_token: 'old-refresh',
    });
  });
});

describe('TwitchProvider.post as a chat message', () => {
  it('sends the message as the broadcaster', async () => {
    const fetchStub = chatRoute();

    await expect(
      provider.post('77', 'token', [post() as never], integration)
    ).resolves.toEqual([
      {
        id: 'post-1',
        postId: 'msg-1',
        releaseURL: 'https://twitch.tv/mychannel',
        status: 'posted',
      },
    ]);

    expect(fetchStub.body('/helix/chat/messages')).toEqual({
      broadcaster_id: '77',
      sender_id: '77',
      message: 'hello chat',
    });
  });

  it('does not set a reply parent for a root post', async () => {
    const fetchStub = chatRoute();

    await provider.post('77', 'token', [post() as never], integration);

    expect(fetchStub.body('/helix/chat/messages')).not.toHaveProperty(
      'reply_parent_message_id'
    );
  });

  it('truncates to the chat limit rather than letting Twitch reject it', async () => {
    const fetchStub = chatRoute();

    await provider.post(
      '77',
      'token',
      [post({ message: 'a'.repeat(900) }) as never],
      integration
    );

    expect(fetchStub.body('/helix/chat/messages').message).toHaveLength(500);
  });

  it('reports an error status when Twitch says the message was not sent', async () => {
    chatRoute(false);

    const [result] = await provider.post('77', 'token', [post() as never], integration);

    expect(result.status).toBe('error');
  });

  it('invents an id when Twitch returns none', async () => {
    stubFetch([['/helix/chat/messages', () => ({ data: [] })]]);

    const [result] = await provider.post('77', 'token', [post() as never], integration);

    expect(result.postId).toHaveLength(10);
    expect(result.status).toBe('error');
  });

  it('falls back to the provider name when the channel has no profile', async () => {
    chatRoute();

    const [result] = await provider.post('77', 'token', [post() as never], {
      providerIdentifier: 'twitch',
    } as never);

    expect(result.releaseURL).toBe('https://twitch.tv/twitch');
  });
});

describe('TwitchProvider.post as an announcement', () => {
  it('uses the announcements endpoint instead of chat', async () => {
    const fetchStub = chatRoute();

    const [result] = await provider.post(
      '77',
      'token',
      [post({ settings: { messageType: 'announcement' } }) as never],
      integration
    );

    expect(fetchStub.countTo('/helix/chat/announcements')).toBe(1);
    expect(fetchStub.countTo('/helix/chat/messages')).toBe(0);
    expect(result.status).toBe('posted');
  });

  it('addresses the broadcaster as their own moderator', async () => {
    const fetchStub = chatRoute();

    await provider.post(
      '77',
      'token',
      [post({ settings: { messageType: 'announcement' } }) as never],
      integration
    );

    const url = fetchStub.urls()[0];
    expect(url).toContain('broadcaster_id=77');
    expect(url).toContain('moderator_id=77');
  });

  it('defaults the colour to primary', async () => {
    const fetchStub = chatRoute();

    await provider.post(
      '77',
      'token',
      [post({ settings: { messageType: 'announcement' } }) as never],
      integration
    );

    expect(fetchStub.body('/helix/chat/announcements').color).toBe('primary');
  });

  it('honours a chosen colour', async () => {
    const fetchStub = chatRoute();

    await provider.post(
      '77',
      'token',
      [
        post({
          settings: { messageType: 'announcement', announcementColor: 'purple' },
        }) as never,
      ],
      integration
    );

    expect(fetchStub.body('/helix/chat/announcements').color).toBe('purple');
  });

  it('invents an id, because an announcement returns 204 with no body', async () => {
    chatRoute();

    const [result] = await provider.post(
      '77',
      'token',
      [post({ settings: { messageType: 'announcement' } }) as never],
      integration
    );

    expect(result.postId).toHaveLength(10);
  });

  it('truncates an announcement to the chat limit too', async () => {
    const fetchStub = chatRoute();

    await provider.post(
      '77',
      'token',
      [
        post({
          message: 'b'.repeat(900),
          settings: { messageType: 'announcement' },
        }) as never,
      ],
      integration
    );

    expect(fetchStub.body('/helix/chat/announcements').message).toHaveLength(500);
  });
});

describe('TwitchProvider.comment', () => {
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

    expect(fetchStub.body('/helix/chat/messages')).toMatchObject({
      message: 'a reply',
      reply_parent_message_id: 'msg-1',
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

    expect(fetchStub.body('/helix/chat/messages').reply_parent_message_id).toBe(
      'msg-9'
    );
  });

  it('sends a comment as an announcement when asked, losing the threading', async () => {
    // Twitch announcements have no reply concept at all, so a threaded
    // announcement is simply a second announcement.
    const fetchStub = chatRoute();

    await provider.comment(
      '77',
      'msg-1',
      undefined,
      'token',
      [post({ settings: { messageType: 'announcement' } }) as never],
      integration
    );

    expect(fetchStub.countTo('/helix/chat/announcements')).toBe(1);
    expect(fetchStub.countTo('/helix/chat/messages')).toBe(0);
  });

  it('reports an error status when the reply was not sent', async () => {
    chatRoute(false);

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
