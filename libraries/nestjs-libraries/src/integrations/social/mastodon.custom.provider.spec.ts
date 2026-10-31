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

import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { MastodonCustomProvider } from './mastodon.custom.provider';

const provider = new MastodonCustomProvider();

const INSTANCE = 'https://social.example';
const FRONTEND = 'https://app.postiz.test';

const integrationFor = (instanceUrl: string | undefined) =>
  ({
    customInstanceDetails:
      instanceUrl === undefined
        ? ''
        : AuthService.fixedEncryption(JSON.stringify({ instanceUrl })),
  } as never);

const post = (over: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: 'hello fediverse',
  settings: {},
  ...over,
});

beforeEach(() => {
  process.env.FRONTEND_URL = FRONTEND;
  delete process.env.MASTODON_URL;
});

describe('MastodonCustomProvider identity', () => {
  it('is a distinct provider from the hosted one', () => {
    expect(provider.identifier).toBe('mastodon-custom');
    expect(provider.name).toBe('M. Instance');
  });

  it('edits as plain text', () => {
    expect(provider.editor).toBe('normal');
  });
});

describe('MastodonCustomProvider.externalUrl', () => {
  it('registers an app on the instance and keeps only the credentials', async () => {
    const fetchStub = stubFetch([
      [
        '/api/v1/apps',
        () => ({
          client_id: 'the-id',
          client_secret: 'the-secret',
          id: '1',
          vapid_key: 'ignored',
        }),
      ],
    ]);

    await expect(provider.externalUrl(INSTANCE)).resolves.toEqual({
      client_id: 'the-id',
      client_secret: 'the-secret',
    });
    expect(fetchStub.urls()[0]).toBe(`${INSTANCE}/api/v1/apps`);
  });

  it('registers through the SSRF-safe dispatcher', async () => {
    // The instance URL is typed in by the user, so this is what stops a
    // connect from probing the internal network.
    const fetchStub = stubFetch([['/api/v1/apps', () => ({})]]);

    await provider.externalUrl(INSTANCE);

    expect(fetchStub.calls[0].init).toMatchObject({ dispatcher: 'ssrf-dispatcher' });
  });

  it('declares Postiz, the redirect and its scopes to the instance', async () => {
    const fetchStub = stubFetch([['/api/v1/apps', () => ({})]]);

    await provider.externalUrl(INSTANCE);

    const form = fetchStub.calls[0].init.body as FormData;
    expect(form.get('client_name')).toBe('Postiz');
    expect(form.get('redirect_uris')).toBe(
      `${FRONTEND}/integrations/social/mastodon`
    );
    expect(form.get('website')).toBe(FRONTEND);
    expect(String(form.get('scopes')).split(' ')).toEqual(provider.scopes);
  });
});

describe('MastodonCustomProvider.generateAuthUrl', () => {
  it('never emits an undefined host or client id', async () => {
    // The regression this guards: the signature used to take `refresh` first,
    // so the controller's single ClientInformation argument bound to the wrong
    // parameter and every custom-instance connect produced
    // "undefined/oauth/authorize?client_id=undefined".
    const { url } = await provider.generateAuthUrl({
      instanceUrl: INSTANCE,
      client_id: 'client-1',
    } as never);

    expect(url).not.toContain('undefined');
    expect(url.startsWith(`${INSTANCE}/oauth/authorize?client_id=client-1&`)).toBe(true);
  });

  it('is called the way the controller calls it, with one argument', async () => {
    // integrations.controller.ts passes only getExternalUrl. Calling with two
    // arguments here would let the old broken signature pass this suite.
    expect(provider.generateAuthUrl.length).toBe(1);
  });

  it('points at the caller instance, not the default one', async () => {
    const { url, state } = await provider.generateAuthUrl({
      instanceUrl: INSTANCE,
      client_id: 'client-1',
    } as never);

    expect(url.startsWith(`${INSTANCE}/oauth/authorize`)).toBe(true);
    const params = new URL(url).searchParams;
    expect(params.get('client_id')).toBe('client-1');
    expect(params.get('state')).toBe(state);
    expect(params.get('response_type')).toBe('code');
    expect(params.get('redirect_uri')).toBe(
      `${FRONTEND}/integrations/social/mastodon`
    );
  });

  it('asks for its declared scopes', async () => {
    const { url } = await provider.generateAuthUrl({
      instanceUrl: INSTANCE,
      client_id: 'client-1',
    } as never);

    expect(new URL(url).searchParams.get('scope')!.split(' ')).toEqual(
      provider.scopes
    );
  });

  it('issues a fresh state each time', async () => {
    const external = { instanceUrl: INSTANCE, client_id: 'c' } as never;

    const first = await provider.generateAuthUrl(external);
    const second = await provider.generateAuthUrl(external);

    expect(first.state).not.toBe(second.state);
    expect(first.state).toHaveLength(6);
  });
});

describe('MastodonCustomProvider.authenticate', () => {
  it('exchanges the code against the caller instance and client', async () => {
    const fetchStub = stubFetch([
      ['/oauth/token', () => ({ access_token: 'tok' })],
      [
        '/api/v1/accounts/verify_credentials',
        () => ({ id: '9', display_name: 'Someone', avatar: 'a.png', username: 'someone' }),
      ],
    ]);

    await expect(
      provider.authenticate({ code: 'the-code', codeVerifier: 'v' }, {
        instanceUrl: INSTANCE,
        client_id: 'client-1',
        client_secret: 'secret-1',
      } as never)
    ).resolves.toMatchObject({
      id: '9',
      name: 'Someone',
      accessToken: 'tok',
      username: 'someone',
    });

    expect(fetchStub.urls()[0]).toBe(`${INSTANCE}/oauth/token`);
    expect(fetchStub.urls()[1]).toBe(
      `${INSTANCE}/api/v1/accounts/verify_credentials`
    );
  });
});

describe('MastodonCustomProvider instance resolution', () => {
  const statusRoutes = () =>
    stubFetch([
      ['/api/v1/statuses', () => ({ id: '77', url: `${INSTANCE}/@me/77` })],
    ]);

  it('posts to the instance stored encrypted on the integration', async () => {
    const fetchStub = statusRoutes();

    await provider.post('id', 'tok', [post()], integrationFor(INSTANCE));

    expect(fetchStub.urls()[0]).toBe(`${INSTANCE}/api/v1/statuses`);
  });

  it('falls back to MASTODON_URL for a legacy integration with no stored instance', async () => {
    // Channels connected before the instance was persisted have an empty
    // customInstanceDetails; they must keep working rather than throw.
    process.env.MASTODON_URL = 'https://legacy.example';
    const fetchStub = statusRoutes();

    await provider.post('id', 'tok', [post()], integrationFor(undefined));

    expect(fetchStub.urls()[0]).toBe('https://legacy.example/api/v1/statuses');
  });

  it('falls back to mastodon.social when nothing else is configured', async () => {
    const fetchStub = stubFetch([
      ['mastodon.social/api/v1/statuses', () => ({ id: '1', url: 'u' })],
    ]);

    await provider.post('id', 'tok', [post()], integrationFor(undefined));

    expect(fetchStub.urls()[0]).toBe('https://mastodon.social/api/v1/statuses');
  });

  it.each([
    ['undecryptable bytes', 'not-encrypted-at-all'],
    [
      'valid json with no instanceUrl',
      AuthService.fixedEncryption(JSON.stringify({ somethingElse: true })),
    ],
  ])('falls back rather than throwing on %s', async (_label, customInstanceDetails) => {
    const integration = { customInstanceDetails } as never;
    const fetchStub = stubFetch([
      ['mastodon.social/api/v1/statuses', () => ({ id: '1', url: 'u' })],
    ]);

    await provider.post('id', 'tok', [post()], integration);

    expect(fetchStub.urls()[0]).toContain('mastodon.social');
  });

  it('uses the stored instance for comments too', async () => {
    const fetchStub = stubFetch([
      ['/api/v1/statuses', () => ({ id: '78', url: `${INSTANCE}/@me/78` })],
    ]);

    await provider.comment(
      'id',
      '77',
      undefined,
      'tok',
      [post({ id: 'c-1', message: 'a reply' })],
      integrationFor(INSTANCE)
    );

    expect(fetchStub.urls()[0]).toBe(`${INSTANCE}/api/v1/statuses`);
    const form = fetchStub.calls[0].init.body as FormData;
    expect(form.get('in_reply_to_id')).toBe('77');
  });

  it('carries the instance into pendingData so the poller does not need it again', async () => {
    // checkPostStatus and finalizePost are inherited unchanged, so the instance
    // has to travel inside the pending payload rather than be resolved twice.
    stubFetch([['/api/v1/statuses', () => ({ id: '77', url: 'u' })]]);

    const [result] = await provider.postPending(
      'id',
      'tok',
      [post()],
      integrationFor(INSTANCE)
    );

    expect(result.pendingData).toMatchObject({ url: INSTANCE });
  });
});
