const { isSafePublicHttpsUrl } = vi.hoisted(() => ({
  isSafePublicHttpsUrl: vi.fn(async (_url: string) => true),
}));

// The SSRF check is the gate uploadSimple runs before touching the network,
// so it is the seam that lets a remote upload be exercised at all.
vi.mock('@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator', () => ({
  isSafePublicHttpsUrl,
}));

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { LocalStorage } from './local.storage';

/** A real 1x1 PNG, so file-type sniffs it rather than trusting a claimed mime. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const HTML = Buffer.from('<html><script>alert(1)</script></html>', 'utf-8');

const dataUrl = (mime: string, buffer: Buffer) =>
  `data:${mime};base64,${buffer.toString('base64')}`;

let directory: string;
let storage: LocalStorage;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'postiz-local-storage-'));
  storage = new LocalStorage(directory);
  vi.stubEnv('FRONTEND_URL', 'https://app.example.com');
  isSafePublicHttpsUrl.mockResolvedValue(true);
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

/** The public path the uploader returns, resolved back to a real file. */
const onDisk = (returned: string) =>
  join(directory, returned.replace('https://app.example.com/uploads', ''));

describe('LocalStorage.uploadSimple from a data url', () => {
  it('writes the decoded bytes under a dated path', async () => {
    const returned = await storage.uploadSimple(dataUrl('image/png', PNG));

    // the name is 32 nibbles joined as hex, but Math.round(random * 16) can
    // yield 16, which stringifies to "10", so the length is not fixed at 32
    expect(returned).toMatch(
      /^https:\/\/app\.example\.com\/uploads\/\d{4}\/\d{2}\/\d{2}\/[0-9a-f]{32,64}\.png$/
    );
    expect(readFileSync(onDisk(returned))).toEqual(PNG);
  });

  it('sniffs the bytes rather than trusting the declared mime', async () => {
    // an attacker declaring svg to get a scriptable extension still gets .png,
    // because the extension comes from the sniffed type
    const returned = await storage.uploadSimple(dataUrl('image/svg+xml', PNG));

    expect(returned.endsWith('.png')).toBe(true);
  });

  it('refuses bytes that are not an allowed media type', async () => {
    await expect(
      storage.uploadSimple(dataUrl('image/png', HTML))
    ).rejects.toThrow(/Unsupported file type/);
  });

  it('writes nothing when the type is refused', async () => {
    await storage.uploadSimple(dataUrl('image/png', HTML)).catch(() => undefined);

    const [year] = new Date().toISOString().split('-');
    expect(existsSync(join(directory, year))).toBe(false);
  });

  it('accepts every allowed image format', async () => {
    const png = await storage.uploadSimple(dataUrl('image/png', PNG));
    const gif = await storage.uploadSimple(dataUrl('image/gif', GIF));

    expect(png.endsWith('.png')).toBe(true);
    expect(gif.endsWith('.gif')).toBe(true);
  });

  it('gives every upload its own name', async () => {
    const first = await storage.uploadSimple(dataUrl('image/png', PNG));
    const second = await storage.uploadSimple(dataUrl('image/png', PNG));

    expect(first).not.toBe(second);
  });

  it('never reaches the network for a data url', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await storage.uploadSimple(dataUrl('image/png', PNG));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(isSafePublicHttpsUrl).not.toHaveBeenCalled();
  });
});

describe('LocalStorage.uploadSimple from a remote url', () => {
  it('refuses an address the ssrf guard rejects, before fetching', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    isSafePublicHttpsUrl.mockResolvedValue(false);

    await expect(
      storage.uploadSimple('http://169.254.169.254/latest/meta-data')
    ).rejects.toThrow(/Unsafe URL/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('downloads and stores an allowed image', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(PNG))
    );

    const returned = await storage.uploadSimple('https://cdn.example.test/a.png');

    expect(readFileSync(onDisk(returned))).toEqual(PNG);
  });

  it('ignores the extension in the url and uses the sniffed type', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(GIF))
    );

    const returned = await storage.uploadSimple(
      'https://cdn.example.test/looks-like.png'
    );

    expect(returned.endsWith('.gif')).toBe(true);
  });

  it('refuses a download whose bytes are not an allowed type', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(HTML))
    );

    await expect(
      storage.uploadSimple('https://cdn.example.test/a.png')
    ).rejects.toThrow(/Unsupported file type/);
  });
});

describe('LocalStorage.uploadFile', () => {
  it('stores the buffer and reports the sniffed type back', async () => {
    const result = await storage.uploadFile({
      buffer: PNG,
      originalname: 'whatever.svg',
    } as never);

    expect(result).toMatchObject({
      filename: expect.stringMatching(/^[0-9a-f]{32,64}\.png$/),
      mimetype: 'image/png',
      path: expect.stringContaining('https://app.example.com/uploads/'),
    });
    expect(readFileSync(onDisk(result.path))).toEqual(PNG);
  });

  it('renames the file rather than keeping what the client sent', async () => {
    const result = await storage.uploadFile({
      buffer: PNG,
      originalname: '../../escape.html',
    } as never);

    expect(result.originalname).toBe(result.filename);
    expect(result.filename).not.toContain('escape');
    expect(result.filename).not.toContain('..');
  });

  it('refuses a buffer that is not an allowed media type', async () => {
    await expect(
      storage.uploadFile({ buffer: HTML, originalname: 'a.png' } as never)
    ).rejects.toThrow(/Unsupported file type/);
  });
});

describe('LocalStorage.removeFile', () => {
  it('deletes a file that exists', async () => {
    const target = join(directory, 'delete-me.png');
    writeFileSync(target, PNG);

    await expect(storage.removeFile(target)).resolves.toBeUndefined();
    expect(existsSync(target)).toBe(false);
  });

  it('rejects when the file cannot be removed', async () => {
    await expect(
      storage.removeFile(join(directory, 'never-existed.png'))
    ).rejects.toBeTruthy();
  });
});
