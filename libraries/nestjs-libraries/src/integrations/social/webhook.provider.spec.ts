import { normalizeWebhookHeaders, readWebhookUrl } from './webhook.channel';
import { WebhookProvider, webhookPostBody } from './webhook.provider';
import { Integration } from '@prisma/client';

jest.mock('@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator', () => ({
  isSafePublicHttpsUrl: jest.fn(async (url: string) =>
    typeof url === 'string' && url.startsWith('https://example.com')
  ),
}));

jest.mock('@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher', () => ({
  getSsrfSafeDispatcher: () => ({}),
}));

const integration = {
  id: 'int-1',
  name: 'Alerts',
  providerIdentifier: 'webhook',
  picture: '',
  type: 'social',
} as Integration;

const token = Buffer.from(
  JSON.stringify({
    url: 'https://example.com/hook',
    headers: [{ name: 'Authorization', value: 'Bearer secret-value' }],
  })
).toString('base64');

describe('webhook channel', () => {
  it('drops blank header rows and rejects blocked, duplicate, and empty names', () => {
    expect(
      normalizeWebhookHeaders([
        { name: '', value: '' },
        { name: 'X-Event', value: 'post' },
      ])
    ).toEqual({ headers: [{ name: 'X-Event', value: 'post' }] });

    expect(normalizeWebhookHeaders([{ name: '', value: 'secret-value' }])).toEqual({
      error: 'A header needs a name.',
    });
    expect(
      normalizeWebhookHeaders([{ name: 'Content-Type', value: 'text/plain' }])
    ).toEqual({ error: 'Content-Type cannot be set.' });
    expect(
      normalizeWebhookHeaders([
        { name: 'X-Event', value: 'a' },
        { name: 'x-event', value: 'b' },
      ])
    ).toEqual({ error: 'Each header name can only be used once.' });
    expect(
      normalizeWebhookHeaders([{ name: 'X-Event', value: 'line\nbreak' }])
    ).toEqual({ error: 'A header value is not valid.' });
  });

  it('accepts only https URLs without embedded credentials', () => {
    expect(readWebhookUrl('http://example.com/hook')).toEqual({
      error: 'The URL must start with https://.',
    });
    expect(readWebhookUrl('https://user:secret-value@example.com/hook')).toEqual({
      error: 'The URL cannot contain a username or password.',
    });
    expect(readWebhookUrl('https://example.com/hook')).toEqual({
      url: 'https://example.com/hook',
    });
  });

  it('builds the same post shape the publish webhook sends', () => {
    const body = webhookPostBody(
      {
        id: 'post-1',
        message: 'stripped',
        sourceContent: '<p>hello</p>',
        sourceImage: [{ id: 'media-1', path: 'https://cdn.example/a.png' }],
        settings: {},
        publishDate: '2026-10-13T12:00:00.000Z',
        state: 'QUEUE',
      },
      integration
    );

    expect(body).toEqual({
      id: 'post-1',
      content: '<p>hello</p>',
      image: [{ id: 'media-1', path: 'https://cdn.example/a.png' }],
      settings: {},
      publishDate: '2026-10-13T12:00:00.000Z',
      releaseURL: '',
      state: 'QUEUE',
      integration: {
        id: 'int-1',
        name: 'Alerts',
        providerIdentifier: 'webhook',
        picture: '',
        type: 'social',
      },
    });
    expect(JSON.stringify(body)).not.toContain('secret-value');
  });
});

describe('WebhookProvider', () => {
  const provider = new WebhookProvider();

  it('keeps the same channel id when the URL does not change', async () => {
    const auth = await provider.authenticate({
      code: Buffer.from(
        JSON.stringify({
          name: 'Alerts',
          url: 'https://example.com/hook',
          headers: [{ name: 'X-Event', value: 'post' }],
        })
      ).toString('base64'),
      codeVerifier: 'x',
    });

    expect(typeof auth).not.toBe('string');
    if (typeof auth === 'string') {
      return;
    }

    expect(auth.id).toBe(Buffer.from('https://example.com/hook').toString('base64'));
    expect(auth.name).toBe('Alerts');
    expect(auth.picture).toBe('/icons/platforms/webhook.png');
    expect(JSON.parse(Buffer.from(auth.accessToken, 'base64').toString())).toEqual({
      url: 'https://example.com/hook',
      headers: [{ name: 'X-Event', value: 'post' }],
    });
  });
});

describe('WebhookProvider.post', () => {
  const provider = new WebhookProvider();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('posts the payload with the saved headers', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      status: 204,
      body: { cancel: jest.fn() },
    } as unknown as Response);

    const result = await provider.post(
      'channel',
      token,
      [
        {
          id: 'post-1',
          message: 'hello',
          settings: {},
          sourceContent: 'hello',
          sourceImage: [],
          publishDate: '2026-10-13T12:00:00.000Z',
          state: 'QUEUE',
        },
      ],
      integration
    );

    expect(result).toEqual([
      {
        id: 'post-1',
        postId: 'post-1',
        releaseURL: '',
        status: 'completed',
      },
    ]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.com/hook');
    expect(init?.method).toBe('POST');
    expect(init?.redirect).toBe('manual');
    const sent = new Headers(init?.headers);
    expect(sent.get('content-type')).toBe('application/json');
    expect(sent.get('authorization')).toBe('Bearer secret-value');
    expect(JSON.parse(String(init?.body))).toEqual([
      expect.objectContaining({ id: 'post-1', content: 'hello', releaseURL: '' }),
    ]);
  });

  it('fails the post on a non-2xx response without the response body or header value', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      status: 500,
      body: { cancel: jest.fn() },
    } as unknown as Response);

    await expect(
      provider.post('channel', token, [{ id: 'post-1', message: 'hello', settings: {} }], integration)
    ).rejects.toThrow('The webhook URL returned HTTP 500');

    try {
      await provider.post(
        'channel',
        token,
        [{ id: 'post-1', message: 'hello', settings: {} }],
        integration
      );
    } catch (err) {
      expect(String((err as Error).message)).not.toContain('secret-value');
    }
  });
});
