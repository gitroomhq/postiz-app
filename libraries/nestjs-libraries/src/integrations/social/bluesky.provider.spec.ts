vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

const login = vi.fn();
const getProfile = vi.fn();
const uploadBlob = vi.fn();
const getPostThread = vi.fn();
const agentPost = vi.fn();
const repost = vi.fn();
const searchActors = vi.fn();
const getJobStatus = vi.fn();

// BskyAgent talks to a user-supplied service over its own HTTP client, so the
// only way to exercise the provider is to stand in for the agent itself.
vi.mock('@atproto/api', () => {
  class Agent {
    login = login;
    getProfile = getProfile;
    uploadBlob = uploadBlob;
    getPostThread = getPostThread;
    post = agentPost;
    repost = repost;
    searchActors = searchActors;
    api = {};
    // getVideoJobStatus builds its own agent against video.bsky.app and reads
    // the job through this namespace.
    app = { bsky: { video: { getJobStatus } } };
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

import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { BadBody, RefreshToken } from '../social.abstract';
import { BlueskyProvider } from './bluesky.provider';

const provider = new BlueskyProvider();

const connected = (service = 'https://bsky.social') =>
  ({
    internalId: 'did:plc:1',
    profile: 'me.bsky.social',
    customInstanceDetails: AuthService.fixedEncryption(
      JSON.stringify({ service, identifier: 'me.bsky.social', password: 'app-password' })
    ),
  } as never);

const integration = connected();

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

const armed = (over: Record<string, unknown> = {}) =>
  pending({ attempting: true, confirmed: true, ...over });

const httpError = (status: number) => Object.assign(new Error('rejected'), { status });

beforeEach(() => {
  login.mockResolvedValue({ data: { accessJwt: 'a', refreshJwt: 'r', did: 'did:plc:1' } });
  agentPost.mockResolvedValue({ uri: 'at://did:plc:1/app.bsky.feed.post/abc123', cid: 'cid-1' });
});

describe('BlueskyProvider.getAgent', () => {
  it('turns a rejected login into a refresh-token failure, not a prep retry', async () => {
    // finalizePost rethrows RefreshToken explicitly so the workflow runs the
    // reconnect flow instead of burning its retry budget.
    login.mockRejectedValue(new Error('Invalid identifier or password'));

    await expect(
      provider.finalizePost('token', armed(), integration)
    ).rejects.toBeInstanceOf(RefreshToken);
  });

  it('logs in with the credentials stored encrypted on the channel', async () => {
    await provider.finalizePost('token', armed(), integration);

    expect(login).toHaveBeenCalledWith({
      identifier: 'me.bsky.social',
      password: 'app-password',
    });
  });
});

describe('BlueskyProvider.postPending', () => {
  it('carries the message and media forward without publishing anything', async () => {
    const [result] = await provider.postPending(
      'id',
      'token',
      [
        {
          id: 'post-1',
          message: 'hello',
          settings: {},
          media: [{ type: 'image', path: '/a.jpg', alt: 'a picture' }],
        } as never,
      ],
      integration
    );

    expect(result).toMatchObject({ id: 'post-1', status: 'pending', postId: '', releaseURL: '' });
    expect(result.pendingData).toEqual({
      jobId: '',
      message: 'hello',
      media: [{ path: '/a.jpg', alt: 'a picture' }],
    });
    expect(agentPost).not.toHaveBeenCalled();
  });

  it('defaults a missing alt text to empty rather than undefined', async () => {
    const [result] = await provider.postPending(
      'id',
      'token',
      [{ id: 'p', message: 'm', settings: {}, media: [{ type: 'image', path: '/a.jpg' }] } as never],
      integration
    );

    expect(result.pendingData.media).toEqual([{ path: '/a.jpg', alt: '' }]);
  });

  it('handles a post with no media at all', async () => {
    const [result] = await provider.postPending(
      'id',
      'token',
      [{ id: 'p', message: 'm', settings: {} } as never],
      integration
    );

    expect(result.pendingData).toMatchObject({ jobId: '', media: [] });
  });
});

describe('BlueskyProvider.checkPostStatus video job', () => {
  it('keeps polling while the job has produced no blob', async () => {
    getJobStatus.mockResolvedValue({ data: { jobStatus: { state: 'JOB_STATE_RUNNING' } } });

    await expect(
      provider.checkPostStatus('token', pending({ jobId: 'job-1' }), integration)
    ).resolves.toMatchObject({ status: 'pending' });
  });

  it('is ready once the job carries a blob', async () => {
    getJobStatus.mockResolvedValue({
      data: { jobStatus: { state: 'JOB_STATE_COMPLETED', blob: { ref: 'b' } } },
    });

    await expect(
      provider.checkPostStatus('token', pending({ jobId: 'job-1' }), integration)
    ).resolves.toMatchObject({ status: 'ready' });
  });

  it('fails the post when the video job failed', async () => {
    getJobStatus.mockResolvedValue({ data: { jobStatus: { state: 'JOB_STATE_FAILED' } } });

    await expect(
      provider.checkPostStatus('token', pending({ jobId: 'job-1' }), integration)
    ).rejects.toBeInstanceOf(BadBody);
  });

  it('treats a status-check error as transient and keeps polling', async () => {
    // The job may still finish; the workflow's own budget decides when to stop.
    getJobStatus.mockRejectedValue(new Error('video service down'));

    await expect(
      provider.checkPostStatus('token', pending({ jobId: 'job-1' }), integration)
    ).resolves.toMatchObject({ status: 'pending' });
  });

  it('lets a refresh-token failure through rather than swallowing it', async () => {
    getJobStatus.mockRejectedValue(new RefreshToken('bluesky', '{}', {} as never));

    await expect(
      provider.checkPostStatus('token', pending({ jobId: 'job-1' }), integration)
    ).rejects.toBeInstanceOf(RefreshToken);
  });

  it('witnesses an armed attempt while confirming the video is ready', async () => {
    getJobStatus.mockResolvedValue({
      data: { jobStatus: { state: 'JOB_STATE_COMPLETED', blob: { ref: 'b' } } },
    });

    await expect(
      provider.checkPostStatus(
        'token',
        pending({ jobId: 'job-1', attempting: true, confirmed: false }),
        integration
      )
    ).resolves.toMatchObject({ pendingData: { confirmed: true } });
  });
});

describe('BlueskyProvider.finalizePost', () => {
  it('publishes a text-only post and builds its permalink', async () => {
    await expect(provider.finalizePost('token', armed(), integration)).resolves.toEqual({
      status: 'completed',
      postId: 'at://did:plc:1/app.bsky.feed.post/abc123',
      releaseURL: 'https://bsky.app/profile/did:plc:1/post/abc123',
    });
  });

  it('sends no embed when there is no media', async () => {
    await provider.finalizePost('token', armed(), integration);

    expect(agentPost).toHaveBeenCalledTimes(1);
    expect(agentPost.mock.calls[0][0]).not.toHaveProperty('embed');
    expect(agentPost.mock.calls[0][0]).toMatchObject({ text: 'hello from the test suite' });
  });

  it.each([400, 403, 413, 422])(
    'fails the post outright on a definite %i rejection',
    async (status) => {
      // A 4xx means nothing was created, so failing here is safe and beats the
      // conservative "may already be published" warning.
      agentPost.mockRejectedValue(httpError(status));

      await expect(
        provider.finalizePost('token', armed(), integration)
      ).rejects.toBeInstanceOf(BadBody);
    }
  );

  it.each([429, 500, 502, 503])(
    'stays on the unknown-outcome path for an ambiguous %i',
    async (status) => {
      // The post may or may not exist; rethrowing keeps the duplicate guard.
      agentPost.mockRejectedValue(httpError(status));

      await expect(
        provider.finalizePost('token', armed(), integration)
      ).rejects.not.toBeInstanceOf(BadBody);
    }
  );

  it('rethrows a network error with no status at all', async () => {
    agentPost.mockRejectedValue(new Error('socket hang up'));

    await expect(
      provider.finalizePost('token', armed(), integration)
    ).rejects.toThrow('socket hang up');
  });

  it('re-reads the video blob from the job rather than the pending payload', async () => {
    getJobStatus.mockResolvedValue({
      data: { jobStatus: { state: 'JOB_STATE_COMPLETED', blob: { ref: 'blob-1' } } },
    });

    await provider.finalizePost('token', armed({ jobId: 'job-1' }), integration);

    expect(agentPost.mock.calls[0][0].embed).toEqual({
      $type: 'app.bsky.embed.video',
      video: { ref: 'blob-1' },
    });
  });

  it('disarms and keeps polling when the blob has gone missing', async () => {
    getJobStatus.mockResolvedValue({ data: { jobStatus: { state: 'JOB_STATE_RUNNING' } } });

    await expect(
      provider.finalizePost('token', armed({ jobId: 'job-1' }), integration)
    ).resolves.toMatchObject({
      status: 'pending',
      pendingData: { attempting: false, confirmed: false },
    });
    expect(agentPost).not.toHaveBeenCalled();
  });

  it('fails the post when the job failed at finalize time', async () => {
    getJobStatus.mockResolvedValue({ data: { jobStatus: { state: 'JOB_STATE_FAILED' } } });

    await expect(
      provider.finalizePost('token', armed({ jobId: 'job-1' }), integration)
    ).rejects.toBeInstanceOf(BadBody);
  });

  it('counts preparation failures and disarms each time', async () => {
    // Nothing is created during preparation, so disarming is safe and lets a
    // later cycle re-arm cleanly.
    getJobStatus.mockRejectedValue(new Error('video service hiccup'));

    await expect(
      provider.finalizePost('token', armed({ jobId: 'job-1', prepFailures: 1 }), integration)
    ).resolves.toMatchObject({
      status: 'pending',
      pendingData: { attempting: false, confirmed: false, prepFailures: 2 },
    });
    expect(agentPost).not.toHaveBeenCalled();
  });

  it('starts the failure count from zero when there is none yet', async () => {
    getJobStatus.mockRejectedValue(new Error('video service hiccup'));

    await expect(
      provider.finalizePost('token', armed({ jobId: 'job-1' }), integration)
    ).resolves.toMatchObject({ pendingData: { prepFailures: 1 } });
  });

  it('gives up with an accurate message once preparation keeps failing', async () => {
    // Nothing was ever created, so saying so beats exhausting the check budget
    // into a misleading "check your account" warning.
    getJobStatus.mockRejectedValue(new Error('video service hiccup'));

    await expect(
      provider.finalizePost('token', armed({ jobId: 'job-1', prepFailures: 4 }), integration)
    ).rejects.toBeInstanceOf(BadBody);
  });
});

describe('BlueskyProvider.comment', () => {
  const thread = (over: Record<string, unknown> = {}) => ({
    data: { thread: { post: { cid: 'parent-cid', record: {}, ...over } } },
  });

  it('replies with the parent as both root and parent for a first comment', async () => {
    getPostThread.mockResolvedValue(thread());

    const [result] = await provider.comment(
      'did:plc:1',
      'at://did:plc:1/app.bsky.feed.post/root1',
      undefined,
      'token',
      [{ id: 'c-1', message: 'a reply', settings: {} } as never],
      integration
    );

    expect(agentPost.mock.calls[0][0].reply).toEqual({
      root: { uri: 'at://did:plc:1/app.bsky.feed.post/root1', cid: 'parent-cid' },
      parent: { uri: 'at://did:plc:1/app.bsky.feed.post/root1', cid: 'parent-cid' },
    });
    expect(result).toMatchObject({ id: 'c-1', status: 'completed' });
  });

  it('keeps the original root when replying to a later comment', async () => {
    // Bluesky threads are flat under one root: losing it detaches the reply.
    getPostThread.mockResolvedValue(
      thread({ record: { reply: { root: { uri: 'at://root', cid: 'root-cid' } } } })
    );

    await provider.comment(
      'did:plc:1',
      'at://post',
      'at://previous-comment',
      'token',
      [{ id: 'c-2', message: 'chained', settings: {} } as never],
      integration
    );

    expect(getPostThread).toHaveBeenCalledWith({ uri: 'at://previous-comment', depth: 0 });
    expect(agentPost.mock.calls[0][0].reply).toEqual({
      root: { uri: 'at://root', cid: 'root-cid' },
      parent: { uri: 'at://previous-comment', cid: 'parent-cid' },
    });
  });

  it('builds the permalink from the profile id it was given', async () => {
    getPostThread.mockResolvedValue(thread());

    const [result] = await provider.comment(
      'me.bsky.social',
      'at://post',
      undefined,
      'token',
      [{ id: 'c-1', message: 'x', settings: {} } as never],
      integration
    );

    expect(result.releaseURL).toBe('https://bsky.app/profile/me.bsky.social/post/abc123');
  });
});

describe('BlueskyProvider auto plugs', () => {
  const threadWith = (likeCount: number) => ({
    data: { thread: { post: { uri: 'at://post', cid: 'cid-1', likeCount } } },
  });

  it('reposts once the like threshold is reached', async () => {
    getPostThread.mockResolvedValue(threadWith(50));

    await expect(
      provider.autoRepostPost(integration, 'at://post', { likesAmount: '10' })
    ).resolves.toBe(true);
    expect(repost).toHaveBeenCalledWith('at://post', 'cid-1');
  });

  it('does not repost below the threshold', async () => {
    getPostThread.mockResolvedValue(threadWith(2));

    await expect(
      provider.autoRepostPost(integration, 'at://post', { likesAmount: '10' })
    ).resolves.toBe(true);
    expect(repost).not.toHaveBeenCalled();
  });

  it('reposts exactly at the threshold', async () => {
    getPostThread.mockResolvedValue(threadWith(10));

    await provider.autoRepostPost(integration, 'at://post', { likesAmount: '10' });

    expect(repost).toHaveBeenCalled();
  });

  it('plugs a follow-up reply once the threshold is reached', async () => {
    getPostThread.mockResolvedValue(threadWith(50));

    await expect(
      provider.autoPlugPost(integration, 'at://post', {
        likesAmount: '10',
        post: '<p>Check out my course</p>',
      })
    ).resolves.toBe(true);

    expect(agentPost).toHaveBeenCalledTimes(1);
    const sent = agentPost.mock.calls[0][0];
    expect(sent.text).not.toContain('<p>');
    expect(sent.reply).toEqual({
      root: { uri: 'at://post', cid: 'cid-1' },
      parent: { uri: 'at://post', cid: 'cid-1' },
    });
  });

  it('does not plug below the threshold', async () => {
    getPostThread.mockResolvedValue(threadWith(2));

    await provider.autoPlugPost(integration, 'at://post', {
      likesAmount: '10',
      post: 'hello',
    });

    expect(agentPost).not.toHaveBeenCalled();
  });
});

describe('BlueskyProvider mentions', () => {
  it('reshapes an actor search for the mention picker', async () => {
    searchActors.mockResolvedValue({
      data: {
        actors: [
          { displayName: 'Someone', handle: 'someone.bsky.social', avatar: 'a.png' },
          { displayName: 'Other', handle: 'other.bsky.social', avatar: 'b.png' },
        ],
      },
    });

    await expect(
      provider.mention('token', { query: 'some' }, 'id', integration)
    ).resolves.toEqual([
      { label: 'Someone', id: 'someone.bsky.social', image: 'a.png' },
      { label: 'Other', id: 'other.bsky.social', image: 'b.png' },
    ]);
    expect(searchActors).toHaveBeenCalledWith({ q: 'some' });
  });

  it('formats a mention by handle, since that is what Bluesky resolves', () => {
    expect(provider.mentionFormat('someone.bsky.social', 'Someone')).toBe(
      '@someone.bsky.social'
    );
  });
});
