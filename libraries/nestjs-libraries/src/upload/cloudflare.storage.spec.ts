const { isSafePublicHttpsUrl } = vi.hoisted(() => ({
  isSafePublicHttpsUrl: vi.fn(async (_url: string) => true),
}));

vi.mock('@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator', () => ({
  isSafePublicHttpsUrl,
}));

const s3 = vi.hoisted(() => ({
  send: vi.fn(async (_command: { input: Record<string, unknown> }) => ({})),
  addMiddleware: vi.fn(),
  config: undefined as any,
}));

// The bucket client is built in the constructor, so the sdk is the seam: the
// stand-in records what would have been sent to R2.
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = s3.send;
    middlewareStack = { add: s3.addMiddleware };
    constructor(config: unknown) {
      s3.config = config;
    }
  },
  PutObjectCommand: class {
    constructor(public input: Record<string, unknown>) {}
  },
}));

import { CloudflareStorage } from './cloudflare.storage';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const HTML = Buffer.from('<html><script>alert(1)</script></html>', 'utf-8');

const dataUrl = (mime: string, buffer: Buffer) =>
  `data:${mime};base64,${buffer.toString('base64')}`;

const UPLOAD_URL = 'https://cdn.example.test';

let storage: CloudflareStorage;

beforeEach(() => {
  storage = new CloudflareStorage(
    'account-1',
    'access-key',
    'secret-key',
    'auto',
    'my-bucket',
    UPLOAD_URL
  );
  isSafePublicHttpsUrl.mockResolvedValue(true);
});

/** The PutObjectCommand the storage handed to the client. */
const sent = () => s3.send.mock.calls[0][0].input as Record<string, any>;

describe('CloudflareStorage client setup', () => {
  it('points at the account r2 endpoint with the given credentials', () => {
    expect(s3.config).toMatchObject({
      endpoint: 'https://account-1.r2.cloudflarestorage.com',
      region: 'auto',
      credentials: {
        accessKeyId: 'access-key',
        secretAccessKey: 'secret-key',
      },
    });
  });

  it('registers a build step that strips the checksum headers r2 rejects', async () => {
    const [middleware, options] = s3.addMiddleware.mock.calls[0] as [
      (next: unknown) => (args: unknown) => Promise<unknown>,
      { step: string; name: string }
    ];
    expect(options).toEqual({ step: 'build', name: 'customHeaders' });

    const next = vi.fn(async (args: any) => args);
    const handled: any = await middleware(next)({
      request: {
        headers: {
          'x-amz-checksum-crc32': 'a',
          'x-amz-checksum-crc32c': 'b',
          'x-amz-checksum-sha1': 'c',
          'x-amz-checksum-sha256': 'd',
          'content-type': 'image/png',
        },
      },
    } as never);

    expect(handled.request.headers).toEqual({ 'content-type': 'image/png' });
  });
});

describe('CloudflareStorage.uploadSimple', () => {
  it('stores a data url under a random key and returns its public url', async () => {
    const returned = await storage.uploadSimple(dataUrl('image/png', PNG));

    expect(returned).toMatch(
      new RegExp(`^${UPLOAD_URL}/[A-Za-z0-9]{10}\\.png$`)
    );
    expect(sent()).toMatchObject({
      Bucket: 'my-bucket',
      ContentType: 'image/png',
      Body: PNG,
    });
    expect(returned.endsWith(sent().Key)).toBe(true);
  });

  it('sniffs the bytes rather than trusting the declared mime', async () => {
    await storage.uploadSimple(dataUrl('image/svg+xml', PNG));

    expect(sent().ContentType).toBe('image/png');
    expect(sent().Key.endsWith('.png')).toBe(true);
  });

  it('refuses bytes that are not an allowed media type', async () => {
    await expect(
      storage.uploadSimple(dataUrl('image/png', HTML))
    ).rejects.toThrow(/Unsupported file type/);
    expect(s3.send).not.toHaveBeenCalled();
  });

  it('refuses an address the ssrf guard rejects, before fetching', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    isSafePublicHttpsUrl.mockResolvedValue(false);

    await expect(
      storage.uploadSimple('http://169.254.169.254/latest/meta-data')
    ).rejects.toThrow(/Unsafe URL/);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(s3.send).not.toHaveBeenCalled();
  });

  it('downloads a remote image and stores the bytes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(GIF))
    );

    const returned = await storage.uploadSimple('https://origin.test/a.png');

    expect(sent().ContentType).toBe('image/gif');
    expect(returned.endsWith('.gif')).toBe(true);
  });

  it('gives each upload its own key', async () => {
    const first = await storage.uploadSimple(dataUrl('image/png', PNG));
    const second = await storage.uploadSimple(dataUrl('image/png', PNG));

    expect(first).not.toBe(second);
  });
});

describe('CloudflareStorage.uploadFile', () => {
  it('uploads publicly readable and describes the stored object', async () => {
    const result = await storage.uploadFile({
      buffer: PNG,
      mimetype: 'image/svg+xml',
      size: PNG.length,
    } as never);

    expect(sent()).toMatchObject({
      Bucket: 'my-bucket',
      ACL: 'public-read',
      ContentType: 'image/png',
    });
    expect(result).toMatchObject({
      filename: expect.stringMatching(/^[A-Za-z0-9]{10}\.png$/),
      path: expect.stringContaining(`${UPLOAD_URL}/`),
      fieldname: 'file',
    });
    expect(result.originalname).toBe(result.filename);
  });

  it('refuses a buffer that is not an allowed media type', async () => {
    await expect(
      storage.uploadFile({ buffer: HTML, mimetype: 'image/png' } as never)
    ).rejects.toThrow(/Unsupported file type/);
    expect(s3.send).not.toHaveBeenCalled();
  });

  it('rethrows a failure from the bucket', async () => {
    s3.send.mockRejectedValue(new Error('bucket unreachable'));

    await expect(
      storage.uploadFile({ buffer: PNG, mimetype: 'image/png' } as never)
    ).rejects.toThrow(/bucket unreachable/);
  });
});

describe('CloudflareStorage.removeFile', () => {
  it('is a no-op, because objects are kept after a post is deleted', async () => {
    await expect(storage.removeFile('anything')).resolves.toBeUndefined();
    expect(s3.send).not.toHaveBeenCalled();
  });
});
