import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { NotEnoughScopes } from '../social.abstract';
import { SlackProvider } from './slack.provider';

const provider = new SlackProvider();

const integration = { name: 'Acme Bot', picture: 'https://cdn.test/bot.png' } as never;

const post = (over: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: 'hello slack',
  settings: { channel: 'C123' },
  ...over,
});

const SCOPES = [
  'channels:read',
  'chat:write',
  'users:read',
  'groups:read',
  'channels:join',
  'chat:write.customize',
];

const happyPath = () =>
  stubFetch([
    ['conversations.join', () => ({ ok: true })],
    ['chat.postMessage', () => ({ ok: true, ts: '1700000000.123', channel: 'C123' })],
    ['chat.getPermalink', () => ({ ok: true, permalink: 'https://acme.slack.com/p/1' })],
  ]);

beforeEach(() => {
  process.env.SLACK_ID = 'slack-client-id';
  process.env.SLACK_SECRET = 'slack-client-secret';
  process.env.FRONTEND_URL = 'https://app.postiz.test';
});

describe('SlackProvider identity', () => {
  it('declares the Slack block limit', () => {
    expect(provider.maxLength()).toBe(400000);
    expect(provider.identifier).toBe('slack');
    expect(provider.editor).toBe('normal');
  });

  it('returns an empty token set on refresh, because a bot token does not expire', async () => {
    await expect(provider.refreshToken('x')).resolves.toMatchObject({
      accessToken: '',
      refreshToken: '',
    });
  });
});

describe('SlackProvider.generateAuthUrl', () => {
  it('asks for exactly the scopes it declares', async () => {
    const { url, state, codeVerifier } = await provider.generateAuthUrl();
    const scope = new URL(url).searchParams.get('scope')!.split(',');

    expect(scope).toEqual(SCOPES);
    expect(new URL(url).searchParams.get('state')).toBe(state);
    expect(state).toHaveLength(6);
    expect(codeVerifier).toHaveLength(10);
  });

  it('sends the callback straight back to an https frontend', async () => {
    const { url } = await provider.generateAuthUrl();

    expect(new URL(url).searchParams.get('redirect_uri')).toBe(
      'https://app.postiz.test/integrations/social/slack'
    );
  });

  it('routes a plain-http frontend through redirectmeto, which Slack requires', async () => {
    // Slack refuses to register an http:// redirect, so local development is
    // bounced via redirectmeto.com. Losing this silently breaks every local
    // Slack connect.
    process.env.FRONTEND_URL = 'http://localhost:4200';

    const { url } = await provider.generateAuthUrl();

    expect(new URL(url).searchParams.get('redirect_uri')).toBe(
      'https://redirectmeto.com/http://localhost:4200/integrations/social/slack'
    );
  });

  it('carries the configured client id', async () => {
    const { url } = await provider.generateAuthUrl();

    expect(new URL(url).searchParams.get('client_id')).toBe('slack-client-id');
  });
});

describe('SlackProvider.authenticate', () => {
  const authRoutes = (scope = SCOPES.join(',')) =>
    stubFetch([
      [
        'oauth.v2.access',
        () => ({
          access_token: 'xoxb-token',
          team: { id: 'T1' },
          bot_user_id: 'U1',
          scope,
        }),
      ],
      [
        'users.info',
        () => ({
          user: {
            real_name: 'Acme Bot',
            name: 'acmebot',
            profile: { image_original: 'https://cdn.test/bot.png' },
          },
        }),
      ],
    ]);

  it('exchanges the code and describes the bot user', async () => {
    const fetchStub = authRoutes();

    const result = await provider.authenticate({ code: 'the-code', codeVerifier: 'v' });

    expect(result).toMatchObject({
      id: 'T1',
      name: 'Acme Bot',
      username: 'acmebot',
      accessToken: 'xoxb-token',
      picture: 'https://cdn.test/bot.png',
    });
    expect(fetchStub.urls()[1]).toContain('users.info?user=U1');
  });

  it('posts the client credentials and the code as form data', async () => {
    const fetchStub = authRoutes();

    await provider.authenticate({ code: 'the-code', codeVerifier: 'v' });

    const body = new URLSearchParams(
      String(fetchStub.calls[0].init.body)
    );
    expect(Object.fromEntries(body)).toMatchObject({
      client_id: 'slack-client-id',
      client_secret: 'slack-client-secret',
      code: 'the-code',
      redirect_uri: 'https://app.postiz.test/integrations/social/slack',
    });
  });

  it('appends the refresh marker to the redirect when reconnecting', async () => {
    const fetchStub = authRoutes();

    await provider.authenticate({ code: 'c', codeVerifier: 'v', refresh: 'int-9' });

    const body = new URLSearchParams(String(fetchStub.calls[0].init.body));
    expect(body.get('redirect_uri')).toBe(
      'https://app.postiz.test/integrations/social/slack?refresh=int-9'
    );
  });

  it('refuses a grant that is missing a scope it needs', async () => {
    // Slack silently issues a token with fewer scopes than requested when the
    // workspace admin trims them, and the failure would otherwise surface much
    // later as a confusing "not_in_channel" at publish time.
    authRoutes('channels:read,chat:write');

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v' })
    ).rejects.toBeInstanceOf(NotEnoughScopes);
  });

  it('accepts a grant carrying extra scopes', async () => {
    authRoutes([...SCOPES, 'files:write'].join(','));

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v' })
    ).resolves.toMatchObject({ id: 'T1' });
  });

  it('falls back to an empty picture when the bot has no avatar', async () => {
    stubFetch([
      [
        'oauth.v2.access',
        () => ({ access_token: 't', team: { id: 'T1' }, bot_user_id: 'U1', scope: SCOPES.join(',') }),
      ],
      ['users.info', () => ({ user: { real_name: 'Bot', name: 'bot', profile: {} } })],
    ]);

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v' })
    ).resolves.toMatchObject({ picture: '' });
  });

  it('issues a token that effectively never expires', async () => {
    authRoutes();

    const result = await provider.authenticate({ code: 'c', codeVerifier: 'v' });

    expect(result.expiresIn).toBeGreaterThan(90 * 365 * 24 * 60 * 60);
  });
});

describe('SlackProvider.channels', () => {
  it('reduces the conversation list to id and name', async () => {
    const fetchStub = stubFetch([
      [
        'conversations.list',
        () => ({
          channels: [
            { id: 'C1', name: 'general', is_private: false, extra: 'ignored' },
            { id: 'C2', name: 'secret', is_private: true },
          ],
        }),
      ],
    ]);

    await expect(provider.channels('xoxb', {}, 'id')).resolves.toEqual([
      { id: 'C1', name: 'general' },
      { id: 'C2', name: 'secret' },
    ]);
    expect(fetchStub.urls()[0]).toContain('types=public_channel,private_channel');
    expect(fetchStub.calls[0].init.headers).toMatchObject({
      Authorization: 'Bearer xoxb',
    });
  });

  it('returns an empty list when the workspace has no channels', async () => {
    stubFetch([['conversations.list', () => ({ channels: [] })]]);

    await expect(provider.channels('xoxb', {}, 'id')).resolves.toEqual([]);
  });
});

describe('SlackProvider.post', () => {
  it('joins the channel before posting to it', async () => {
    // chat.postMessage fails with not_in_channel for a bot that was never
    // added, so the join is load-bearing and must come first.
    const fetchStub = happyPath();

    await provider.post('id', 'xoxb', [post()], integration);

    expect(fetchStub.urls()[0]).toContain('conversations.join');
    expect(fetchStub.body('conversations.join')).toEqual({ channel: 'C123' });
    expect(fetchStub.urls()[1]).toContain('chat.postMessage');
  });

  it('sends the message as a single mrkdwn section', async () => {
    const fetchStub = happyPath();

    await provider.post('id', 'xoxb', [post()], integration);

    expect(fetchStub.body('chat.postMessage')).toMatchObject({
      channel: 'C123',
      username: 'Acme Bot',
      icon_url: 'https://cdn.test/bot.png',
      blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'hello slack' } }],
    });
  });

  it('appends one image block per attachment', async () => {
    const fetchStub = happyPath();

    await provider.post(
      'id',
      'xoxb',
      [
        post({
          media: [
            { type: 'image', path: 'https://cdn.test/a.png' },
            { type: 'image', path: 'https://cdn.test/b.png' },
          ],
        }),
      ],
      integration
    );

    expect(fetchStub.body('chat.postMessage').blocks).toEqual([
      { type: 'section', text: { type: 'mrkdwn', text: 'hello slack' } },
      { type: 'image', image_url: 'https://cdn.test/a.png', alt_text: '' },
      { type: 'image', image_url: 'https://cdn.test/b.png', alt_text: '' },
    ]);
  });

  it('reports the timestamp as the post id and the permalink as the release URL', async () => {
    happyPath();

    await expect(provider.post('id', 'xoxb', [post()], integration)).resolves.toEqual([
      {
        id: 'post-1',
        postId: '1700000000.123',
        releaseURL: 'https://acme.slack.com/p/1',
        status: 'posted',
      },
    ]);
  });

  it('asks for the permalink using the channel Slack answered with', async () => {
    // Posting to a channel name or a DM returns a different channel id than the
    // one sent, and using the request's own value would 404 the permalink.
    const fetchStub = stubFetch([
      ['conversations.join', () => ({ ok: true })],
      ['chat.postMessage', () => ({ ts: '111.222', channel: 'C-RESOLVED' })],
      ['chat.getPermalink', () => ({ permalink: 'https://acme.slack.com/p/2' })],
    ]);

    await provider.post('id', 'xoxb', [post()], integration);

    expect(fetchStub.urls()[2]).toContain('channel=C-RESOLVED');
    expect(fetchStub.urls()[2]).toContain('message_ts=111.222');
  });

  it('falls back to an empty release URL when Slack returns no permalink', async () => {
    stubFetch([
      ['conversations.join', () => ({ ok: true })],
      ['chat.postMessage', () => ({ ts: '1.2', channel: 'C1' })],
      ['chat.getPermalink', () => ({ ok: false, error: 'message_not_found' })],
    ]);

    const [result] = await provider.post('id', 'xoxb', [post()], integration);

    expect(result.releaseURL).toBe('');
    expect(result.postId).toBe('1.2');
  });

  it('only publishes the first post of the batch', async () => {
    const fetchStub = happyPath();

    await provider.post('id', 'xoxb', [post(), post({ id: 'post-2' })], integration);

    expect(fetchStub.countTo('chat.postMessage')).toBe(1);
  });
});

describe('SlackProvider.comment', () => {
  it('threads onto the root post when there is no previous comment', async () => {
    const fetchStub = happyPath();

    await provider.comment(
      'id',
      '1700000000.123',
      undefined,
      'xoxb',
      [post({ id: 'c-1', message: 'a reply' })],
      integration
    );

    expect(fetchStub.body('chat.postMessage')).toMatchObject({
      thread_ts: '1700000000.123',
      blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'a reply' } }],
    });
  });

  it('keeps the whole chain on the root thread, not the previous reply', async () => {
    // Slack has no nested threads: replying to a reply must still carry the
    // root ts, or the comment lands in the channel as a new message.
    const fetchStub = happyPath();

    await provider.comment(
      'id',
      '111.000',
      '222.000',
      'xoxb',
      [post({ id: 'c-2' })],
      integration
    );

    expect(fetchStub.body('chat.postMessage').thread_ts).toBe('222.000');
  });

  it('does not re-join the channel for a comment', async () => {
    const fetchStub = happyPath();

    await provider.comment('id', '1.2', undefined, 'xoxb', [post()], integration);

    expect(fetchStub.countTo('conversations.join')).toBe(0);
  });

  it('attaches media to a comment too', async () => {
    const fetchStub = happyPath();

    await provider.comment(
      'id',
      '1.2',
      undefined,
      'xoxb',
      [post({ media: [{ type: 'image', path: 'https://cdn.test/c.png' }] })],
      integration
    );

    expect(fetchStub.body('chat.postMessage').blocks).toContainEqual({
      type: 'image',
      image_url: 'https://cdn.test/c.png',
      alt_text: '',
    });
  });

  it('reports the reply timestamp and permalink', async () => {
    happyPath();

    await expect(
      provider.comment('id', '1.2', undefined, 'xoxb', [post({ id: 'c-1' })], integration)
    ).resolves.toEqual([
      {
        id: 'c-1',
        postId: '1700000000.123',
        releaseURL: 'https://acme.slack.com/p/1',
        status: 'posted',
      },
    ]);
  });
});

describe('SlackProvider profile mutations', () => {
  it('echoes back without calling Slack, because a bot identity is per-message', async () => {
    // username and icon_url are set on every chat.postMessage, so there is no
    // workspace-level profile to change.
    const fetchStub = stubFetch([]);

    await expect(
      provider.changeProfilePicture('id', 'xoxb', 'https://cdn.test/new.png')
    ).resolves.toEqual({ url: 'https://cdn.test/new.png' });
    await expect(provider.changeNickname('id', 'xoxb', 'New Name')).resolves.toEqual({
      name: 'New Name',
    });
    expect(fetchStub.calls).toHaveLength(0);
  });
});
