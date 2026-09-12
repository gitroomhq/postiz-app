import { describe, expect, it, vi } from 'vitest';

vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { ListmonkProvider } from './listmonk.provider';

const provider = new ListmonkProvider();

const URL_ = 'https://mail.test';
const BASIC = Buffer.from('admin:app pass').toString('base64');

const details = () =>
  JSON.stringify({ url: URL_, username: 'admin', password: 'app pass' });

const credentials = () => Buffer.from(details()).toString('base64');

const integration = {
  customInstanceDetails: AuthService.fixedEncryption(details()),
} as never;

const post = (settings: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: '<p>The newsletter body</p>',
  settings: { subject: 'This Week In Postiz', list: '3', ...settings },
});

describe('ListmonkProvider identity', () => {
  it('is an html editor with an effectively unlimited body', () => {
    expect(provider.identifier).toBe('listmonk');
    expect(provider.editor).toBe('html');
    expect(provider.maxLength()).toBe(100000000);
  });

  it('asks for the instance url and basic credentials', async () => {
    const fields = await provider.customFields();

    expect(fields.map((f) => f.key)).toEqual(['url', 'username', 'password']);
    expect(fields.find((f) => f.key === 'password')?.type).toBe('password');
  });

  it('has no oauth, so the state doubles as the url', async () => {
    const { url, state } = await provider.generateAuthUrl();

    expect(url).toBe(state);
  });

  it('returns an empty token set on refresh, because basic auth does not expire', async () => {
    await expect(provider.refreshToken('x')).resolves.toMatchObject({
      accessToken: '',
      expiresIn: 0,
    });
  });
});

describe('ListmonkProvider.authenticate', () => {
  it('reads the instance settings and stores the basic credentials as the token', async () => {
    const fetchStub = stubFetch([
      [
        '/api/settings',
        () => ({
          data: {
            'app.site_name': 'Acme Mail',
            'app.logo_url': 'https://mail.test/logo.png',
          },
        }),
      ],
    ]);

    await expect(
      provider.authenticate({ code: credentials(), codeVerifier: 'v' })
    ).resolves.toMatchObject({
      // The channel id is the instance url, so two Listmonk channels on
      // different instances never collide.
      id: Buffer.from(URL_).toString('base64'),
      name: 'Acme Mail',
      username: 'Acme Mail',
      accessToken: BASIC,
      refreshToken: BASIC,
      picture: 'https://mail.test/logo.png',
    });

    expect(fetchStub.urls()[0]).toBe(`${URL_}/api/settings`);
    expect(fetchStub.calls[0].init.headers).toMatchObject({
      Authorization: `Basic ${BASIC}`,
    });
  });

  it('falls back to an empty logo when the instance has none', async () => {
    stubFetch([['/api/settings', () => ({ data: { 'app.site_name': 'Acme' } })]]);

    await expect(
      provider.authenticate({ code: credentials(), codeVerifier: 'v' })
    ).resolves.toMatchObject({ picture: '' });
  });

  it('reports invalid credentials rather than throwing when the instance is unreachable', async () => {
    stubFetch([]);

    await expect(
      provider.authenticate({ code: credentials(), codeVerifier: 'v' })
    ).resolves.toBe('Invalid credentials');
  });

  it('reports invalid credentials when the answer carries no settings', async () => {
    stubFetch([['/api/settings', () => ({})]]);

    await expect(
      provider.authenticate({ code: credentials(), codeVerifier: 'v' })
    ).resolves.toBe('Invalid credentials');
  });

  it('issues a token that effectively never expires', async () => {
    stubFetch([['/api/settings', () => ({ data: { 'app.site_name': 'A' } })]]);

    const result = await provider.authenticate({
      code: credentials(),
      codeVerifier: 'v',
    });

    expect((result as { expiresIn: number }).expiresIn).toBeGreaterThan(
      90 * 365 * 24 * 60 * 60
    );
  });
});

describe('ListmonkProvider.list', () => {
  it('reduces the subscriber lists to id and name', async () => {
    const fetchStub = stubFetch([
      [
        '/api/lists',
        () => ({
          data: {
            results: [
              { id: 1, name: 'Subscribers', subscriber_count: 900 },
              { id: 2, name: 'Beta' },
            ],
          },
        }),
      ],
    ]);

    await expect(provider.list('token', {}, 'id', integration)).resolves.toEqual([
      { id: 1, name: 'Subscribers' },
      { id: 2, name: 'Beta' },
    ]);
    expect(fetchStub.urls()[0]).toBe(`${URL_}/api/lists`);
    expect(fetchStub.calls[0].init.headers).toMatchObject({
      Authorization: `Basic ${BASIC}`,
    });
  });

  it('reads the instance from the encrypted channel details, not the token', async () => {
    // The token is opaque to the caller; every tool re-derives the url and
    // credentials from customInstanceDetails.
    const fetchStub = stubFetch([['/api/lists', () => ({ data: { results: [] } })]]);

    await provider.list('ignored-token', {}, 'id', integration);

    expect(fetchStub.urls()[0]).toContain(URL_);
  });
});

describe('ListmonkProvider.templates', () => {
  it('offers the instance default ahead of the real templates', async () => {
    // Listmonk treats template_id 0 as "use the default", which is not in the
    // API's own list.
    stubFetch([
      ['/api/templates', () => ({ data: [{ id: 5, name: 'Newsletter' }] })],
    ]);

    await expect(
      provider.templates('token', {}, 'id', integration)
    ).resolves.toEqual([
      { id: 0, name: 'Default' },
      { id: 5, name: 'Newsletter' },
    ]);
  });

  it('still offers the default when the instance has no templates', async () => {
    stubFetch([['/api/templates', () => ({ data: [] })]]);

    await expect(
      provider.templates('token', {}, 'id', integration)
    ).resolves.toEqual([{ id: 0, name: 'Default' }]);
  });
});

describe('ListmonkProvider.post', () => {
  const campaignRoutes = () =>
    stubFetch([
      ['/api/campaigns/7/status', () => ({ data: { id: 7 } })],
      ['/api/campaigns', () => ({ data: { id: 7, uuid: 'uuid-7' } })],
    ]);

  it('creates the campaign and then starts it', async () => {
    // Creating alone leaves a draft nobody receives; the status PUT is what
    // actually sends the newsletter.
    const fetchStub = campaignRoutes();

    await expect(
      provider.post('id', 'token', [post() as never], integration)
    ).resolves.toEqual([
      {
        id: 'post-1',
        status: 'completed',
        postId: 'uuid-7',
        releaseURL: `${URL_}/api/campaigns/7/preview`,
      },
    ]);

    expect(fetchStub.urls()[0]).toBe(`${URL_}/api/campaigns`);
    expect(fetchStub.urls()[1]).toBe(`${URL_}/api/campaigns/7/status`);
    expect(fetchStub.body('/api/campaigns/7/status')).toEqual({ status: 'running' });
  });

  it('slugifies the subject into the campaign name', async () => {
    const fetchStub = campaignRoutes();

    await provider.post('id', 'token', [post() as never], integration);

    expect(fetchStub.body('/api/campaigns')).toMatchObject({
      name: 'this-week-in-postiz',
      subject: 'This Week In Postiz',
      type: 'regular',
      content_type: 'html',
    });
  });

  it('sends the list id as a number, because Listmonk rejects a string', async () => {
    const fetchStub = campaignRoutes();

    await provider.post('id', 'token', [post({ list: '3' }) as never], integration);

    expect(fetchStub.body('/api/campaigns').lists).toEqual([3]);
  });

  it('wraps the message in the campaign body', async () => {
    const fetchStub = campaignRoutes();

    await provider.post('id', 'token', [post() as never], integration);

    expect(fetchStub.body('/api/campaigns').body).toContain(
      '<p>The newsletter body</p>'
    );
  });

  it('hides the preview text so only the inbox preview shows it', async () => {
    // The preheader div is display:none with zero-width padding after it, so
    // the preview line is not repeated at the top of the email itself.
    const fetchStub = campaignRoutes();

    await provider.post(
      'id',
      'token',
      [post({ preview: 'A short teaser' }) as never],
      integration
    );

    const body = fetchStub.body('/api/campaigns').body as string;
    expect(body).toContain('A short teaser');
    expect(body).toContain('hidden-preheader');
    expect(body).toContain('display:none');
  });

  it('leaves the preheader empty when no preview was written', async () => {
    const fetchStub = campaignRoutes();

    await provider.post('id', 'token', [post() as never], integration);

    expect(fetchStub.body('/api/campaigns').body).toContain('hidden-preheader');
  });

  it.each([
    ['no template', undefined],
    ['the default template', '0'],
  ])('omits template_id for %s, so the instance default applies', async (_label, template) => {
    const fetchStub = campaignRoutes();

    await provider.post('id', 'token', [post({ template }) as never], integration);

    expect(fetchStub.body('/api/campaigns')).not.toHaveProperty('template_id');
  });

  it('sends a chosen template as a number', async () => {
    const fetchStub = campaignRoutes();

    await provider.post('id', 'token', [post({ template: '5' }) as never], integration);

    expect(fetchStub.body('/api/campaigns').template_id).toBe(5);
  });

  it('authenticates both calls with basic auth', async () => {
    const fetchStub = campaignRoutes();

    await provider.post('id', 'token', [post() as never], integration);

    for (const call of fetchStub.calls) {
      expect(call.init.headers).toMatchObject({ Authorization: `Basic ${BASIC}` });
    }
  });
});
