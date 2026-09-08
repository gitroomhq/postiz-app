vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

const login = vi.fn();
const getProfile = vi.fn();

// BskyAgent talks to a user-supplied service over its own HTTP client, so the
// only way to exercise the provider is to stand in for the agent itself.
vi.mock('@atproto/api', () => {
  class Agent {
    login = login;
    getProfile = getProfile;
    uploadBlob = vi.fn();
    getPostThread = vi.fn();
    post = vi.fn();
    api = {};
  }

  return {
    BskyAgent: Agent,
    AtpAgent: Agent,
    RichText: class {
      text: string;
      facets: unknown[] = [];
      constructor({ text }: { text: string }) {
        this.text = text;
      }
      async detectFacets() {}
    },
    BlobRef: class {},
    AppBskyEmbedVideo: {},
    AppBskyVideoDefs: {},
  };
});

import { BadBody } from '../social.abstract';
import { BlueskyProvider } from './bluesky.provider';

const provider = new BlueskyProvider();
const integration = { internalId: 'did:plc:1', profile: 'me.bsky.social' } as never;

const pending = (over: Record<string, unknown> = {}): any => ({
  message: 'hello from the test suite',
  images: [],
  ...over,
});

const credentials = (service: string) =>
  Buffer.from(
    JSON.stringify({ service, identifier: 'me.bsky.social', password: 'app-password' })
  ).toString('base64');

describe('BlueskyProvider.checkValidity', () => {
  it('allows only one video per post', async () => {
    await expect(
      provider.checkValidity([[{ path: '/clip.mp4' }, { path: '/a.jpg' }]])
    ).resolves.toBe('You can only upload one video per post.');
  });

  it('caps a post at four pictures', async () => {
    const media = Array.from({ length: 5 }, (_, i) => ({ path: `/a${i}.jpg` }));

    await expect(provider.checkValidity([media])).resolves.toBe(
      'There can be maximum 4 pictures in a post.'
    );
  });

  it('accepts four pictures', async () => {
    const media = Array.from({ length: 4 }, (_, i) => ({ path: `/a${i}.jpg` }));

    await expect(provider.checkValidity([media])).resolves.toBe(true);
  });

  it('accepts a single video', async () => {
    await expect(provider.checkValidity([[{ path: '/clip.mp4' }]])).resolves.toBe(true);
  });

  it('applies the picture cap to comments too', async () => {
    const media = Array.from({ length: 5 }, (_, i) => ({ path: `/a${i}.jpg` }));

    await expect(provider.checkValidity([[], media])).resolves.toBe(
      'There can be maximum 4 pictures in a post.'
    );
  });
});

describe('BlueskyProvider.customFields', () => {
  it('asks for the service, identifier and an app password', async () => {
    const fields = await provider.customFields();

    expect(fields.map((f) => f.key)).toEqual(['service', 'identifier', 'password']);
    expect(fields[0].defaultValue).toBe('https://bsky.social');
    // The password must never be rendered in plain text in the connect form.
    expect(fields[2].type).toBe('password');
  });
});

describe('BlueskyProvider.authenticate', () => {
  it('refuses a service url that is not a public address', async () => {
    vi.stubEnv('DISABLE_SSRF_PROTECTION', 'false');

    // BskyAgent bypasses the undici SSRF dispatcher entirely, so this check is
    // the only thing stopping an internal address being saved as a channel.
    await expect(
      provider.authenticate({
        code: credentials('http://127.0.0.1:8080'),
        codeVerifier: '',
      })
    ).resolves.toBe('Invalid service URL: must be a public HTTPS address');

    expect(login).not.toHaveBeenCalled();
  });

  it('logs in and returns the profile of the connected account', async () => {
    login.mockResolvedValue({
      data: { accessJwt: 'access', refreshJwt: 'refresh', handle: 'me.bsky.social', did: 'did:plc:1' },
    });
    getProfile.mockResolvedValue({
      data: { displayName: 'Me', handle: 'me.bsky.social', avatar: 'https://pic.test' },
    });

    await expect(
      provider.authenticate({ code: credentials('https://bsky.social'), codeVerifier: '' })
    ).resolves.toMatchObject({
      id: 'did:plc:1',
      name: 'Me',
      accessToken: 'access',
      refreshToken: 'refresh',
      picture: 'https://pic.test',
      username: 'me.bsky.social',
    });
  });

  it('reports bad credentials rather than throwing', async () => {
    login.mockRejectedValue(new Error('Invalid identifier or password'));

    await expect(
      provider.authenticate({ code: credentials('https://bsky.social'), codeVerifier: '' })
    ).resolves.toBe('Invalid credentials');
  });
});

describe('BlueskyProvider pending handshake', () => {
  it('is ready straight away for an image-only post', async () => {
    await expect(provider.checkPostStatus('token', pending(), integration)).resolves.toEqual({
      status: 'ready',
      pendingData: pending(),
    });
  });

  it('arms the create attempt without publishing', async () => {
    await expect(provider.finalizePost('token', pending(), integration)).resolves.toEqual({
      status: 'pending',
      pendingData: { ...pending(), attempting: true, confirmed: false },
    });
  });

  it('confirms the armed attempt on the next status check', async () => {
    const armed = pending({ attempting: true, confirmed: false });

    await expect(provider.checkPostStatus('token', armed, integration)).resolves.toEqual({
      status: 'ready',
      pendingData: { ...armed, confirmed: true },
    });
  });

  it('stops rather than risk a duplicate when a confirmed attempt lost its result', async () => {
    await expect(
      provider.checkPostStatus(
        'token',
        pending({ attempting: true, confirmed: true }),
        integration
      )
    ).rejects.toBeInstanceOf(BadBody);
  });
});

describe('BlueskyProvider.refreshToken', () => {
  it('returns empty credentials, because the channel logs in with its stored password', async () => {
    await expect(provider.refreshToken('anything')).resolves.toMatchObject({
      accessToken: '',
      refreshToken: '',
      expiresIn: 0,
    });
  });
});

describe('BlueskyProvider.generateAuthUrl', () => {
  it('returns the state as the url, because there is no OAuth redirect', async () => {
    const { url, state } = await provider.generateAuthUrl();

    expect(url).toBe(state);
  });
});
