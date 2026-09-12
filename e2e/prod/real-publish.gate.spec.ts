import { RUN_ID, expect, gate, test, type RemotePost } from './fixtures';

/**
 * Tier 3: this really publishes to the real social accounts behind the channel
 * ids in POSTIZ_SMOKE_PUBLISH_CHANNELS.
 *
 * Deleting the post afterwards removes Postiz's own record and terminates the
 * workflow - it does NOT retract the post from the network. Whatever this spec
 * publishes stays published, so the channels named here should be accounts kept
 * for exactly this purpose. Leaving POSTIZ_SMOKE_PUBLISH_CHANNELS unset skips
 * the whole file.
 */
test.describe('tier 3: a real post reaches a real social network', () => {
  test.skip(!gate.url, 'POSTIZ_SMOKE_URL is not set');
  test.skip(!gate.apiKey, 'POSTIZ_SMOKE_API_KEY is not set');
  test.skip(
    !gate.publishChannels.length,
    'POSTIZ_SMOKE_PUBLISH_CHANNELS is not set - real publishing is opt-in'
  );

  test('publishes now, reaches PUBLISHED and reports a release URL', async ({
    postiz,
  }, testInfo) => {
    const channels = await postiz.channels();
    const byId = new Map(channels.map((c) => [c.id, c]));

    const targets = gate.publishChannels.map((id) => {
      const channel = byId.get(id);
      expect(
        channel,
        `POSTIZ_SMOKE_PUBLISH_CHANNELS names ${id}, which this deployment does not have`
      ).toBeTruthy();
      expect(channel!.disabled, `channel ${id} (${channel!.name}) is disabled`).toBeFalsy();
      return channel!;
    });

    const content = `Postiz deploy gate ✅ build ${RUN_ID} — automated release check.`;

    const created = await postiz.create({
      type: 'now',
      shortLink: false,
      tags: [],
      date: new Date().toISOString(),
      posts: targets.map((channel) => ({
        integration: { id: channel.id },
        value: [{ content, image: [] }],
        settings: {},
      })),
    });

    expect(
      created.length,
      'the API accepted the request but created no posts'
    ).toBe(targets.length);

    const ids = created.map((c) => c.postId);
    const named = (id: string) => {
      const channelId = created.find((c) => c.postId === id)?.integration;
      return byId.get(channelId ?? '')?.name ?? channelId ?? id;
    };

    try {
      let settled: RemotePost[] = [];

      await expect
        .poll(
          async () => {
            const all = await postiz.posts();
            settled = ids
              .map((id) => all.find((p) => p.id === id))
              .filter((p): p is RemotePost => !!p);
            return settled.filter((p) => p.state !== 'QUEUE').length;
          },
          {
            timeout: 10 * 60_000,
            intervals: [5_000],
            message: `waiting for ${ids.length} post(s) to leave QUEUE on ${gate.url}`,
          }
        )
        .toBe(ids.length);

      const failed = settled.filter((p) => p.state !== 'PUBLISHED');
      expect(
        failed.map((p) => `${named(p.id)} -> ${p.state}`).join(', ') || 'none',
        'a channel did not publish'
      ).toBe('none');

      for (const post of settled) {
        expect(
          post.releaseURL,
          `${named(post.id)} published but reported no release URL`
        ).toBeTruthy();
      }

      // The URLs are the human-readable receipt for the deploy, and the only
      // record of what needs removing from the real accounts if anyone cares to.
      await testInfo.attach('published-urls.txt', {
        contentType: 'text/plain',
        body: settled.map((p) => `${named(p.id)}\t${p.releaseURL}`).join('\n'),
      });
    } finally {
      for (const id of ids) {
        const removed = await postiz.remove(id);
        if (!removed) {
          testInfo.annotations.push({
            type: 'cleanup-failed',
            description: `post ${id} (${named(id)}) is still in Postiz`,
          });
        }
      }
    }
  });

  test('the published post is still readable afterwards on the network', async ({
    postiz,
    request,
  }) => {
    // Separate from the publish assertion on purpose: a provider that returns
    // a release URL for a post that 404s is a failure the deploy should catch,
    // but it is not a reason to doubt that publishing itself worked.
    const channels = await postiz.channels();
    const channel = channels.find((c) => gate.publishChannels.includes(c.id));
    expect(
      channel,
      `none of POSTIZ_SMOKE_PUBLISH_CHANNELS (${gate.publishChannels.join(
        ', '
      )}) exists on this deployment. Known channels: ${channels
        .map((c) => `${c.id} (${c.name})`)
        .join(', ')}`
    ).toBeTruthy();

    const content = `Postiz deploy gate reachability ${RUN_ID}`;
    const [created] = await postiz.create({
      type: 'now',
      shortLink: false,
      tags: [],
      date: new Date().toISOString(),
      posts: [
        { integration: { id: channel!.id }, value: [{ content, image: [] }], settings: {} },
      ],
    });

    let releaseURL: string | null = null;

    try {
      await expect
        .poll(
          async () => {
            const post = await postiz.post(created.postId);
            releaseURL = post?.releaseURL ?? null;
            return post?.state;
          },
          {
            timeout: 10 * 60_000,
            intervals: [5_000],
            message: `waiting for ${channel!.name} to publish`,
          }
        )
        .toBe('PUBLISHED');

      expect(releaseURL, 'no release URL to check').toBeTruthy();

      const response = await request.get(releaseURL!, {
        timeout: 30_000,
        failOnStatusCode: false,
      });

      expect(
        response.status(),
        `${releaseURL} returned ${response.status()}`
      ).toBeLessThan(400);
    } finally {
      await postiz.remove(created.postId);
    }
  });
});
