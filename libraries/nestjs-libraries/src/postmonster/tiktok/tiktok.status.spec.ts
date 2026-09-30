// postmonster: TikTok status polling tests (PRD TT-15/TT-20) - checkPostStatus
// against a mocked TikTok status API: PROCESSING_* keeps polling with
// exponential backoff, PUBLISH_COMPLETE maps to Published with the public id
// when TikTok returned one, FAILED maps fail_reason to a human message.
import { TiktokProvider } from '@gitroom/nestjs-libraries/integrations/social/tiktok.provider';
import { BadBody } from '@gitroom/nestjs-libraries/integrations/social.abstract';

const integration = { profile: 'myprofile' } as any;

const makeProvider = (body: any) => {
  const provider = new TiktokProvider();
  const fetchMock = jest.fn(async () => ({ json: async () => body }));
  (provider as any).fetch = fetchMock;
  return { provider, fetchMock };
};

describe('TikTok checkPostStatus (mocked status API)', () => {
  it('keeps polling on PROCESSING_DOWNLOAD and backs off between API calls', async () => {
    const { provider, fetchMock } = makeProvider({
      data: { status: 'PROCESSING_DOWNLOAD' },
      error: { code: 'ok' },
    });

    const first = await provider.checkPostStatus(
      'token',
      { publishId: 'pub-1' },
      integration
    );
    expect(first.status).toBe('pending');
    expect(((first as any).pendingData as any).checks).toBe(1);
    expect(((first as any).pendingData as any).nextCheckAt).toBeGreaterThan(Date.now());

    // within the backoff window no new API call is made
    const second = await provider.checkPostStatus(
      'token',
      (first as any).pendingData as any,
      integration
    );
    expect(second.status).toBe('pending');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps PUBLISH_COMPLETE to completed with the public post id', async () => {
    const { provider } = makeProvider({
      data: {
        status: 'PUBLISH_COMPLETE',
        publicaly_available_post_id: [987654321],
      },
      error: { code: 'ok' },
    });

    const result = await provider.checkPostStatus(
      'token',
      { publishId: 'pub-2' },
      integration
    );
    expect(result.status).toBe('completed');
    expect((result as any).releaseURL).toBe(
      'https://www.tiktok.com/@myprofile/video/987654321'
    );
    expect(String((result as any).postId)).toBe('987654321');
  });

  it('completes a private post without a public id', async () => {
    const { provider } = makeProvider({
      data: { status: 'PUBLISH_COMPLETE', publicaly_available_post_id: [] },
      error: { code: 'ok' },
    });

    const result = await provider.checkPostStatus(
      'token',
      { publishId: 'pub-3' },
      integration
    );
    expect(result.status).toBe('completed');
    expect((result as any).postId).toBe('pub-3');
    expect((result as any).releaseURL).toBe('https://www.tiktok.com/@myprofile');
  });

  it('maps FAILED fail_reason to a human message (TT-20)', async () => {
    const { provider } = makeProvider({
      data: { status: 'FAILED', fail_reason: 'duration_check_failed' },
      error: { code: 'ok' },
    });

    await expect(
      provider.checkPostStatus('token', { publishId: 'pub-4' }, integration)
    ).rejects.toBeInstanceOf(BadBody);

    await expect(
      provider.checkPostStatus('token', { publishId: 'pub-4' }, integration)
    ).rejects.toThrow(
      'This video is longer than the maximum duration allowed for this TikTok account.'
    );
  });

  it('maps a non-retryable fail_reason like auth_removed', async () => {
    const { provider } = makeProvider({
      data: { status: 'FAILED', fail_reason: 'auth_removed' },
      error: { code: 'ok' },
    });

    await expect(
      provider.checkPostStatus('token', { publishId: 'pub-5' }, integration)
    ).rejects.toThrow('removed Postmonster');
  });

  it('keeps polling when the status call itself fails transiently', async () => {
    const provider = new TiktokProvider();
    (provider as any).fetch = jest.fn(async () => {
      throw new Error('network down');
    });

    const result = await provider.checkPostStatus(
      'token',
      { publishId: 'pub-6' },
      integration
    );
    expect(result.status).toBe('pending');
  });
});
