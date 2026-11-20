import { RUN_ID, expect, gate, test } from './fixtures';

/**
 * Tier 1 and 2 of the deploy gate: everything that can be asserted against a
 * real deployment without leaving a trace on a social network.
 *
 * Tier 1 needs POSTIZ_SMOKE_URL alone. Tier 2 additionally needs
 * POSTIZ_SMOKE_API_KEY. Tier 3 - the one that actually posts - lives in
 * real-publish.gate.spec.ts.
 */
test.describe('tier 1: the deployment answers', () => {
  test.skip(!gate.url, 'POSTIZ_SMOKE_URL is not set');

  test('the backend is serving', async ({ request }) => {
    const response = await request.get(`${gate.url}/`, { timeout: 30_000 });

    expect(
      response.status(),
      `${gate.url}/ returned ${response.status()}`
    ).toBeLessThan(500);
  });

  test('the public API refuses a request with no key', async ({ request }) => {
    const response = await request.get(`${gate.url}/public/v1/integrations`);

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ msg: 'No API Key found' });
  });

  test('the public API refuses a wrong key', async ({ request }) => {
    const response = await request.get(`${gate.url}/public/v1/integrations`, {
      headers: { Authorization: `definitely-not-a-key-${RUN_ID}` },
    });

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ msg: 'Invalid API key' });
  });

  test('a bogus OAuth-shaped token is rejected as an OAuth token', async ({
    request,
  }) => {
    // "pos_" routes down a different branch of PublicAuthMiddleware, so a
    // deploy that broke only the OAuth path would otherwise pass this gate.
    const response = await request.get(`${gate.url}/public/v1/integrations`, {
      headers: { Authorization: `pos_${RUN_ID}` },
    });

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ msg: 'Invalid OAuth token' });
  });
});

test.describe('tier 2: the API key works and posts round-trip', () => {
  test.skip(!gate.url, 'POSTIZ_SMOKE_URL is not set');
  test.skip(!gate.apiKey, 'POSTIZ_SMOKE_API_KEY is not set');

  test('the key authenticates', async ({ request }) => {
    const response = await request.get(`${gate.url}/public/v1/is-connected`, {
      headers: { Authorization: gate.apiKey },
    });

    expect(
      response.ok(),
      `the smoke API key was rejected: ${response.status()} ${await response.text()}`
    ).toBeTruthy();
    expect(await response.json()).toEqual({ connected: true });
  });

  test('the org has at least one connected channel', async ({ postiz }) => {
    const channels = await postiz.channels();

    expect(
      channels.length,
      'the smoke org has no channels connected at all'
    ).toBeGreaterThan(0);

    for (const channel of channels) {
      expect(channel).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        identifier: expect.any(String),
      });
    }
  });

  test('every channel named for tier 3 exists and is enabled', async ({
    postiz,
  }) => {
    test.skip(!gate.publishChannels.length, 'no publish channels configured');

    const channels = await postiz.channels();
    const byId = new Map(channels.map((c) => [c.id, c]));

    for (const id of gate.publishChannels) {
      const channel = byId.get(id);
      expect(
        channel,
        `POSTIZ_SMOKE_PUBLISH_CHANNELS names ${id}, which this deployment does not have. Known channels: ${channels
          .map((c) => `${c.id} (${c.name})`)
          .join(', ')}`
      ).toBeTruthy();
      expect(channel!.disabled, `channel ${id} (${channel!.name}) is disabled`).toBeFalsy();
    }
  });

  test('a draft is created, listed and deleted', async ({ postiz }) => {
    // The strongest assertion available without an external side effect: auth,
    // the DTO pipeline, the provider settings discriminator and the database
    // write all run, and a draft never reaches a workflow.
    //
    // Channels are tried in turn rather than taking the first one, because the
    // public API runs each provider's settings DTO even for a draft - see
    // mapTypeToPost, which stamps type:"schedule" on every post - so a channel
    // whose provider demands extra settings (a subreddit, a video title)
    // rightly rejects an empty settings object.
    const channels = await postiz.channels();
    const preferred = gate.publishChannels;
    const candidates = [...channels].sort((a, b) => {
      const rank = (c: typeof a) =>
        (preferred.includes(c.id) ? 0 : 2) + (c.disabled ? 1 : 0);
      return rank(a) - rank(b);
    });

    const content = `postiz deploy gate draft ${RUN_ID} - not published`;
    const body = (id: string) => ({
      type: 'draft',
      shortLink: false,
      tags: [],
      date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      posts: [{ integration: { id }, value: [{ content, image: [] }], settings: {} }],
    });

    const rejected: string[] = [];
    let created: { postId: string } | undefined;

    for (const channel of candidates) {
      const attempt = await postiz.attemptCreate(body(channel.id));
      if (attempt.ok) {
        [created] = JSON.parse(attempt.text);
        break;
      }
      rejected.push(`${channel.name} (${channel.identifier}): ${attempt.status} ${attempt.text}`);
    }

    expect(
      created?.postId,
      `no channel on this deployment accepted a minimal draft. Set POSTIZ_SMOKE_PUBLISH_CHANNELS to a channel whose provider needs no extra settings. Tried:\n${rejected.join(
        '\n'
      )}`
    ).toBeTruthy();

    try {
      const found = await postiz.post(created!.postId);

      expect(found, 'the created draft was not listed back').toBeTruthy();
      expect(found!.state).toBe('DRAFT');
      expect(found!.content).toContain(RUN_ID);
      expect(found!.releaseURL).toBeFalsy();
    } finally {
      await postiz.remove(created!.postId);
    }

    expect(
      await postiz.post(created!.postId),
      `draft ${created!.postId} survived deletion - remove it by hand`
    ).toBeFalsy();
  });

  test('a post for an unknown channel is refused', async ({ postiz }) => {
    const content = `should never be created ${RUN_ID}`;

    const attempt = await postiz.attemptCreate({
      type: 'draft',
      shortLink: false,
      tags: [],
      date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      posts: [
        {
          integration: { id: `no-such-integration-${RUN_ID}` },
          value: [{ content, image: [] }],
          settings: {},
        },
      ],
    });

    expect(attempt.status).toBe(400);
    expect(
      (await postiz.posts()).some((p) => p.content.includes(content))
    ).toBeFalsy();
  });
});
