import { describe, expect, it, vi } from 'vitest';

vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));
vi.mock('@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher', () => ({
  getSsrfSafeDispatcher: () => 'ssrf-dispatcher',
  ssrfSafeDispatcher: 'ssrf-dispatcher',
}));

import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { BadBody } from '../social.abstract';
import { SkoolProvider } from './skool.provider';

const provider = new SkoolProvider();

const COOKIES = { client_id: 'client-1', auth_token: 'auth-1' };
const COOKIE_HEADER = 'auth_token=auth-1; client_id=client-1';

const integration = {
  customInstanceDetails: AuthService.fixedEncryption(JSON.stringify(COOKIES)),
} as never;

const legacyIntegration = {
  customInstanceDetails: AuthService.signJWT(COOKIES),
} as never;

const post = (over: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: 'hello community',
  settings: { group: 'my-group', title: 'A Post' },
  ...over,
});

describe('SkoolProvider identity', () => {
  it('is a chrome-extension provider with a 5000 character limit', () => {
    expect(provider.identifier).toBe('skool');
    expect(provider.maxLength()).toBe(5000);
    expect(provider.isChromeExtension).toBe(true);
  });

  it('names the two cookies the extension has to collect', () => {
    expect(provider.extensionCookies.map((c) => c.name)).toEqual([
      'client_id',
      'auth_token',
    ]);
  });

  it('has no oauth, so the state doubles as the url', async () => {
    const { url, state } = await provider.generateAuthUrl();

    expect(url).toBe(state);
  });

  it('returns an empty token set on refresh, because cookies do not refresh', async () => {
    await expect(provider.refreshToken('x')).resolves.toMatchObject({
      accessToken: '',
      expiresIn: 0,
    });
  });
});

describe('SkoolProvider.handleErrors', () => {
  it.each([
    ['must be admin or level 2', "You can't post to this channel"],
    ['cannot post to this label', 'Cannot post to this label'],
  ])('turns %s into a terminal bad-body', (body, value) => {
    expect(provider.handleErrors(body)).toEqual({ type: 'bad-body', value });
  });

  it('leaves anything else to the default handling', () => {
    expect(provider.handleErrors('500 server error')).toBeUndefined();
  });
});

describe('SkoolProvider.authenticate', () => {
  const self = () => ({
    id: 'user-1',
    first_name: 'Ada',
    last_name: 'Lovelace',
    name: 'ada',
    metadata: { picture_profile: 'https://cdn.test/me.png' },
  });

  const credentials = (over: Record<string, string> = {}) =>
    Buffer.from(JSON.stringify({ ...COOKIES, ...over })).toString('base64');

  it('reads the account with the collected cookies and stores them encrypted', async () => {
    const fetchStub = stubFetch([['api2.skool.com/self', () => self()]]);

    const result = await provider.authenticate({
      code: credentials(),
      codeVerifier: 'v',
    });

    expect(result).toMatchObject({
      id: 'user-1',
      name: 'Ada Lovelace',
      username: 'ada',
      picture: 'https://cdn.test/me.png',
    });
    // The cookies are session credentials, so they never sit in plain text.
    expect((result as { accessToken: string }).accessToken).not.toContain('auth-1');
    expect(
      JSON.parse(
        AuthService.fixedDecryption((result as { accessToken: string }).accessToken)
      )
    ).toEqual(COOKIES);
    expect(fetchStub.calls[0].init.headers).toMatchObject({ Cookie: COOKIE_HEADER });
  });

  it.each([
    ['auth_token', { auth_token: '' }],
    ['client_id', { client_id: '' }],
  ])('names the missing %s rather than failing opaquely', async (name, over) => {
    const fetchStub = stubFetch([]);

    await expect(
      provider.authenticate({ code: credentials(over), codeVerifier: 'v' })
    ).resolves.toBe(`Missing required cookies: ${name}`);
    expect(fetchStub.calls).toHaveLength(0);
  });

  it('reports unreadable cookie data rather than throwing', async () => {
    await expect(
      provider.authenticate({ code: 'not-base64-json', codeVerifier: 'v' })
    ).resolves.toBe('Invalid cookie data');
  });

  it('reports a failed account read as invalid cookie data', async () => {
    stubFetch([]);

    await expect(
      provider.authenticate({ code: credentials(), codeVerifier: 'v' })
    ).resolves.toBe('Invalid cookie data');
  });

  it('falls back to an empty picture when the profile has none', async () => {
    stubFetch([
      [
        'api2.skool.com/self',
        () => ({ id: '1', first_name: 'A', last_name: 'B', name: 'ab', metadata: {} }),
      ],
    ]);

    await expect(
      provider.authenticate({ code: credentials(), codeVerifier: 'v' })
    ).resolves.toMatchObject({ picture: '' });
  });
});

describe('SkoolProvider credential storage', () => {
  it('reads cookies stored in the current encrypted format', async () => {
    const fetchStub = stubFetch([['/groups?', () => ({ groups: [] })]]);

    await provider.groups('token', {}, 'user-1', integration);

    expect(fetchStub.calls[0].init.headers).toMatchObject({ Cookie: COOKIE_HEADER });
  });

  it('still reads cookies from the legacy signed-JWT format', async () => {
    // Channels connected before the storage format changed must keep working
    // without forcing everyone to reconnect.
    const fetchStub = stubFetch([['/groups?', () => ({ groups: [] })]]);

    await provider.groups('token', {}, 'user-1', legacyIntegration);

    expect(fetchStub.calls[0].init.headers).toMatchObject({ Cookie: COOKIE_HEADER });
  });
});

describe('SkoolProvider.groups', () => {
  it('reduces the group list to id and display name', async () => {
    const fetchStub = stubFetch([
      [
        '/groups?',
        () => ({
          groups: [{ id: 1, metadata: { display_name: 'Photography' } }],
        }),
      ],
    ]);

    await expect(
      provider.groups('token', {}, 'user-1', integration)
    ).resolves.toEqual([{ id: '1', name: 'Photography' }]);
    expect(fetchStub.urls()[0]).toContain('/users/user-1/groups');
  });

  it('returns an empty list rather than throwing when the read fails', async () => {
    stubFetch([]);

    await expect(
      provider.groups('token', {}, 'user-1', integration)
    ).resolves.toEqual([]);
  });
});

describe('SkoolProvider.label', () => {
  it('resolves each label id in the group metadata', async () => {
    const fetchStub = stubFetch([
      ['/groups/group-1', () => ({ metadata: { labels: 'l1,l2' } })],
      [
        /\/labels\/(l1|l2)/,
        ({ url }) => ({
          id: url.split('/').pop(),
          metadata: { display_name: url.endsWith('l1') ? 'News' : 'Wins' },
        }),
      ],
    ]);

    await expect(
      provider.label('token', { id: 'group-1' }, 'user-1', integration)
    ).resolves.toEqual([
      { id: 'l1', name: 'News' },
      { id: 'l2', name: 'Wins' },
    ]);
    expect(fetchStub.countTo('/labels/')).toBe(2);
  });

  it.each([
    ['there are no labels at all', { metadata: {} }],
    ['the label list is empty', { metadata: { labels: '' } }],
  ])('offers a default label when %s', async (_label, body) => {
    stubFetch([['/groups/group-1', () => body]]);

    await expect(
      provider.label('token', { id: 'group-1' }, 'user-1', integration)
    ).resolves.toEqual([{ id: 'none', name: 'Default Label' }]);
  });

  it('returns an empty list rather than throwing when the read fails', async () => {
    stubFetch([]);

    await expect(
      provider.label('token', { id: 'group-1' }, 'user-1', integration)
    ).resolves.toEqual([]);
  });
});

describe('SkoolProvider.post', () => {
  const postRoute = () =>
    stubFetch([['api2.skool.com/posts', () => ({ id: 99, name: 'a-post-slug' })]]);

  it('creates the post in the chosen group and builds its permalink', async () => {
    const fetchStub = postRoute();

    await expect(
      provider.post('user-1', 'token', [post() as never], integration)
    ).resolves.toEqual([
      {
        id: '99',
        postId: 99,
        releaseURL: 'https://www.skool.com/my-group/a-post-slug',
        status: 'success',
      },
    ]);

    expect(fetchStub.body('api2.skool.com/posts')).toMatchObject({
      post_type: 'generic',
      group_id: 'my-group',
      metadata: {
        title: 'A Post',
        content: 'hello community',
        attachments: '',
      },
    });
    expect(fetchStub.calls[0].init.headers).toMatchObject({ Cookie: COOKIE_HEADER });
  });

  it('sends a chosen label', async () => {
    const fetchStub = postRoute();

    await provider.post(
      'user-1',
      'token',
      [post({ settings: { group: 'my-group', title: 'T', label: 'l1' } }) as never],
      integration
    );

    expect(fetchStub.body('api2.skool.com/posts').metadata.labels).toBe('l1');
  });

  it.each([
    ['no label', undefined],
    ['the default label', 'none'],
  ])('omits the label field for %s', async (_case, label) => {
    const fetchStub = postRoute();

    await provider.post(
      'user-1',
      'token',
      [post({ settings: { group: 'my-group', title: 'T', label } }) as never],
      integration
    );

    expect(fetchStub.body('api2.skool.com/posts').metadata).not.toHaveProperty(
      'labels'
    );
  });
});

describe('SkoolProvider media upload', () => {
  const withMedia = () =>
    post({ media: [{ type: 'image', path: 'https://cdn.test/a.png' }] });

  it('creates a file record, streams the bytes and attaches the id', async () => {
    const fetchStub = stubFetch([
      [
        'https://cdn.test/a.png',
        ({ init }) =>
          init.method === 'HEAD'
            ? new Response(null, {
                headers: { 'content-type': 'image/png', 'content-length': '1024' },
              })
            : new Response('bytes'),
      ],
      [
        'api2.skool.com/files',
        () => ({
          write_url: 'https://s3.test/put',
          content_type: 'image/png',
          acl: 'public-read',
          file: { id: 'file-1' },
        }),
      ],
      ['https://s3.test/put', () => new Response(null, { status: 200 })],
      ['api2.skool.com/posts', () => ({ id: 99, name: 'slug' })],
    ]);

    await provider.post('user-1', 'token', [withMedia() as never], integration);

    expect(fetchStub.body('api2.skool.com/files')).toMatchObject({
      file_name: 'a.png',
      content_type: 'image/png',
      content_length: 1024,
      owner_id: 'user-1',
    });
    expect(fetchStub.body('api2.skool.com/posts').metadata.attachments).toBe('file-1');
  });

  it('probes the size through the SSRF-safe dispatcher', async () => {
    // The media path can point anywhere, so the HEAD must not reach the
    // internal network.
    const fetchStub = stubFetch([
      [
        'https://cdn.test/a.png',
        () =>
          new Response(null, {
            headers: { 'content-type': 'image/png', 'content-length': '10' },
          }),
      ],
      ['api2.skool.com/files', () => ({ write_url: 'u', file: { id: 'f' } })],
      ['https://s3.test/put', () => new Response(null)],
      ['api2.skool.com/posts', () => ({ id: 1, name: 's' })],
    ]);

    await provider
      .post('user-1', 'token', [withMedia() as never], integration)
      .catch(() => undefined);

    expect(fetchStub.calls[0].init).toMatchObject({ dispatcher: 'ssrf-dispatcher' });
  });

  it.each([
    ['the probe failed', new Response(null, { status: 404 })],
    [
      'the size is unknown',
      new Response(null, { headers: { 'content-type': 'image/png' } }),
    ],
  ])('fails fast when %s, rather than letting Temporal retry', async (_label, response) => {
    stubFetch([['https://cdn.test/a.png', () => response]]);

    await expect(
      provider.post('user-1', 'token', [withMedia() as never], integration)
    ).rejects.toBeInstanceOf(BadBody);
  });

  it('fails rather than publishing a post with an empty attachment', async () => {
    // The file record exists but no bytes were stored, so carrying on would
    // publish a broken attachment.
    stubFetch([
      [
        'https://cdn.test/a.png',
        () =>
          new Response('bytes', {
            headers: { 'content-type': 'image/png', 'content-length': '10' },
          }),
      ],
      [
        'api2.skool.com/files',
        () => ({ write_url: 'https://s3.test/put', file: { id: 'file-1' } }),
      ],
      ['https://s3.test/put', () => new Response('denied', { status: 403 })],
    ]);

    await expect(
      provider.post('user-1', 'token', [withMedia() as never], integration)
    ).rejects.toBeInstanceOf(BadBody);
  });

  it('sends an empty attachment list for a text-only post', async () => {
    const fetchStub = stubFetch([
      ['api2.skool.com/posts', () => ({ id: 1, name: 's' })],
    ]);

    await provider.post('user-1', 'token', [post() as never], integration);

    expect(fetchStub.body('api2.skool.com/posts').metadata.attachments).toBe('');
    expect(fetchStub.countTo('api2.skool.com/files')).toBe(0);
  });
});

describe('SkoolProvider.comment', () => {
  const commentRoute = () =>
    stubFetch([['api2.skool.com/posts', () => ({ id: 100, name: 'slug' })]]);

  it('replies under the root post when there is no previous comment', async () => {
    const fetchStub = commentRoute();

    await provider.comment(
      'user-1',
      'post-99',
      undefined,
      'token',
      [post({ message: 'a reply' }) as never],
      integration
    );

    expect(fetchStub.body('api2.skool.com/posts')).toMatchObject({
      post_type: 'comment',
      root_id: 'post-99',
      parent_id: 'post-99',
      metadata: { title: '', content: 'a reply' },
    });
  });

  it('nests under the previous comment while keeping the same root', async () => {
    const fetchStub = commentRoute();

    await provider.comment(
      'user-1',
      'post-99',
      'comment-5',
      'token',
      [post() as never],
      integration
    );

    expect(fetchStub.body('api2.skool.com/posts')).toMatchObject({
      root_id: 'post-99',
      parent_id: 'comment-5',
    });
  });
});
