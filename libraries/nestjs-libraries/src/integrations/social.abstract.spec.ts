import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn() }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
}));
vi.mock('@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher', () => ({
  getSsrfSafeAxios: vi.fn(),
  getSsrfSafeDispatcher: vi.fn(),
}));
vi.mock(
  '@gitroom/nestjs-libraries/integrations/dashboard.function.decorator',
  () => ({
    DashboardFunction: () => () => {},
  })
);
import { SocialAbstract } from './social.abstract';
import {
  getSsrfSafeAxios,
  getSsrfSafeDispatcher,
} from '../dtos/webhooks/ssrf.safe.dispatcher';

class MediaReader extends SocialAbstract {
  identifier = 'test';
  read = this.readOrFetch.bind(this);
  size = this.mediaSize.bind(this);
  chunk = this.mediaChunk.bind(this);
  stream = this.mediaStream.bind(this);
  resolveUpload(path: string) {
    return this.resolveLocalUpload(path);
  }
}

let root: string;
let uploads: string;
let reader: MediaReader;
const url = 'https://social.example/uploads/2026/image.jpg';
const content = Buffer.from('example image bytes');

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'postiz-media-'));
  uploads = join(root, 'uploads');
  mkdirSync(join(uploads, '2026'), { recursive: true });
  writeFileSync(join(uploads, '2026/image.jpg'), content);
  vi.stubEnv('STORAGE_PROVIDER', 'local');
  vi.stubEnv('UPLOAD_DIRECTORY', uploads);
  vi.stubEnv('FRONTEND_URL', 'https://social.example');
  reader = new MediaReader();
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Blocked IP')));
  vi.mocked(getSsrfSafeAxios).mockReturnValue(
    vi.fn().mockRejectedValue(new Error('Blocked IP')) as any
  );
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('own local upload URLs', () => {
  it('reads bytes, size, ranges and streams without HTTP or DNS', async () => {
    expect(await reader.read(url)).toEqual(content);
    expect(await reader.size(url)).toBe(content.length);
    expect(await reader.chunk(url, 2, 7)).toEqual(content.subarray(2, 8));
    const chunks = [];
    for await (const chunk of await reader.stream(url)) chunks.push(chunk);
    expect(Buffer.concat(chunks)).toEqual(content);
    expect(fetch).not.toHaveBeenCalled();
    expect(getSsrfSafeAxios).not.toHaveBeenCalled();
    expect(getSsrfSafeDispatcher).not.toHaveBeenCalled();
  });

  it('ignores query strings and fragments when locating local files', async () => {
    expect(await reader.read(url + '?download=1#preview')).toEqual(content);
  });

  it('supports the default local storage provider and existing filesystem paths', async () => {
    vi.stubEnv('STORAGE_PROVIDER', '');
    expect(await reader.read(url)).toEqual(content);
    expect(await reader.read(join(uploads, '2026/image.jpg'))).toEqual(content);
  });

  it.each([
    'https://other.example/uploads/2026/image.jpg',
    'https://social.example.evil/uploads/2026/image.jpg',
    'https://social.example:8443/uploads/2026/image.jpg',
    'http://social.example/uploads/2026/image.jpg',
    'https://social.example/uploads-other/2026/image.jpg',
    'https://social.example/private/image.jpg',
    'https://user:pass@social.example/uploads/2026/image.jpg',
  ])('retains SSRF-safe HTTP for %s', async (path) => {
    await expect(reader.read(path)).rejects.toThrow('Blocked IP');
    expect(getSsrfSafeAxios).toHaveBeenCalledOnce();
  });

  it('does not reinterpret cloud storage URLs as local uploads', async () => {
    vi.stubEnv('STORAGE_PROVIDER', 'cloudflare');
    await expect(reader.read(url)).rejects.toThrow('Blocked IP');
    expect(getSsrfSafeAxios).toHaveBeenCalledOnce();
  });

  it.each(['..%2Fsecret', '%2Fetc%2Fpasswd', '..%2Fuploads-other%2Fsecret'])(
    'rejects decoded traversal %s',
    (suffix) => {
      expect(() =>
        reader.resolveUpload('https://social.example/uploads/' + suffix)
      ).toThrow();
    }
  );

  it('rejects symlinks pointing outside the upload directory', async () => {
    writeFileSync(join(root, 'secret'), 'private');
    symlinkSync(join(root, 'secret'), join(uploads, '2026/link.jpg'));
    await expect(
      reader.read('https://social.example/uploads/2026/link.jpg')
    ).rejects.toThrow('outside the upload directory');
    expect(getSsrfSafeAxios).not.toHaveBeenCalled();
  });
});
