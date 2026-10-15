import { BufferProvider } from './buffer.provider';
import { Integration } from '@prisma/client';

const KEY = 'secret-key';

function code(apiKey: string) {
  return Buffer.from(JSON.stringify({ apiKey })).toString('base64');
}

const integration = {
  id: 'int-1',
  name: 'Buffer',
  providerIdentifier: 'buffer',
  picture: '',
  type: 'social',
} as Integration;

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe('BufferProvider', () => {
  const provider = new BufferProvider();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects a missing API key before calling Buffer', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const auth = await provider.authenticate({
      code: code(''),
      codeVerifier: 'x',
    });

    expect(auth).toBe('The API key is missing.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a key Buffer will not accept and does not echo the key', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({ errors: [{ message: `bad ${KEY}` }] }) as never
    );

    const auth = await provider.authenticate({
      code: code(KEY),
      codeVerifier: 'x',
    });

    expect(typeof auth).toBe('string');
    expect(auth).not.toContain(KEY);
  });

  it('keeps the existing channel id when reconnecting', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({
        data: { account: { organizations: [{ id: 'org-1' }] } },
      }) as never
    );

    const auth = await provider.authenticate({
      code: code(KEY),
      codeVerifier: 'x',
      refresh: 'existing-channel',
    });

    expect(typeof auth).not.toBe('string');
    if (typeof auth === 'string') {
      return;
    }

    expect(auth.id).toBe('existing-channel');
    expect(auth.accessToken).toBe(KEY);
  });

  it('lists profiles from every organization', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      if (String(body.query).includes('organizations')) {
        return jsonResponse({
          data: {
            account: { organizations: [{ id: 'org-1' }, { id: 'org-2' }] },
          },
        }) as never;
      }
      const org = body.variables.organizationId;
      return jsonResponse({
        data: {
          channels: [
            {
              id: org === 'org-1' ? 'chan-1' : 'chan-2',
              name: org === 'org-1' ? 'Parkour' : 'News',
              service: org === 'org-1' ? 'instagram' : 'linkedin',
              avatar: org === 'org-1' ? 'https://cdn.example/a.jpg' : '',
            },
          ],
        },
      }) as never;
    });

    const pages = await provider.pages(KEY);

    expect(pages).toEqual([
      {
        id: 'chan-1',
        name: 'Parkour',
        service: 'instagram',
        avatar: 'https://cdn.example/a.jpg',
      },
      {
        id: 'chan-2',
        name: 'News',
        service: 'linkedin',
        avatar: '',
      },
    ]);
  });

  it('uses the Buffer profile id so connecting that profile again updates the same channel', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      if (String(body.query).includes('organizations')) {
        return jsonResponse({
          data: { account: { organizations: [{ id: 'org-1' }] } },
        }) as never;
      }
      return jsonResponse({
        data: {
          channels: [
            {
              id: 'chan-1',
              name: 'Parkour',
              service: 'instagram',
              avatar: '',
            },
          ],
        },
      }) as never;
    });

    const page = await provider.fetchPageInformation(KEY, { id: 'chan-1' });

    expect(page).toEqual({
      id: 'chan-1',
      name: 'Parkour',
      access_token: KEY,
      picture: '/icons/platforms/buffer.png',
      username: 'instagram',
    });
  });

  it('publishes text, an image, and a video immediately', async () => {
    let sent: { query: string; variables: { input: Record<string, unknown> } } =
      { query: '', variables: { input: {} } };
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      sent = JSON.parse(String(init?.body));
      const headers = new Headers(init?.headers);
      expect(headers.get('authorization')).toBe(`Bearer ${KEY}`);
      return jsonResponse({
        data: {
          createPost: {
            post: { id: 'post-9', externalLink: 'https://instagram.com/p/1' },
          },
        },
      }) as never;
    });

    const [result] = await provider.post(
      'chan-1',
      KEY,
      [
        {
          id: 'local-1',
          message: 'Hello',
          settings: {},
          media: [
            { type: 'image', path: 'https://cdn.example/a.jpg' },
            { type: 'video', path: 'https://cdn.example/b.mp4' },
          ],
        },
      ],
      integration
    );

    expect(sent.query).not.toContain(KEY);
    expect(sent.variables.input).toEqual({
      text: 'Hello',
      channelId: 'chan-1',
      schedulingType: 'automatic',
      mode: 'shareNow',
      assets: [
        { image: { url: 'https://cdn.example/a.jpg' } },
        { video: { url: 'https://cdn.example/b.mp4' } },
      ],
    });
    expect(result).toEqual({
      id: 'local-1',
      postId: 'post-9',
      releaseURL: 'https://instagram.com/p/1',
      status: 'completed',
    });
  });

  it('fails a Buffer rejection without the API key or the request', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({
        data: { createPost: { message: `nope ${KEY}` } },
      }) as never
    );

    await expect(
      provider.post(
        'chan-1',
        KEY,
        [{ id: 'local-1', message: 'Hello', settings: {} }],
        integration
      )
    ).rejects.toThrow(/nope/);

    try {
      await provider.post(
        'chan-1',
        KEY,
        [{ id: 'local-1', message: 'Hello', settings: {} }],
        integration
      );
    } catch (err) {
      expect(String((err as Error).message)).not.toContain(KEY);
      expect(String((err as Error).message)).not.toContain('Hello');
    }
  });

  it('fails a media URL that is not public https before calling Buffer', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');

    await expect(
      provider.post(
        'chan-1',
        KEY,
        [
          {
            id: 'local-1',
            message: 'Hello',
            settings: {},
            media: [{ type: 'image', path: '/uploads/a.jpg' }],
          },
        ],
        integration
      )
    ).rejects.toThrow('Media must be a public https URL.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails an empty post before calling Buffer', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');

    await expect(
      provider.post(
        'chan-1',
        KEY,
        [{ id: 'local-1', message: '   ', settings: {} }],
        integration
      )
    ).rejects.toThrow('Add text or media before publishing.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
