import { PrivateMediaAccess } from '../private.media.access';
import { privateMediaKey, mapMediaUrls } from '../private.media';

const base = 'https://s3.example.com/private-bucket';
const api = 'https://app.example.com/api';
const path = base + '/owned.jpeg';
const preview = api + '/media/private/owned.jpeg';

describe('private media access', () => {
  const saved = { ...process.env };
  let repository: { findOwnedPath: jest.Mock };
  let storage: { signDownloadUrl: jest.Mock };
  let access: PrivateMediaAccess;

  beforeEach(() => {
    process.env.STORAGE_PROVIDER = 'cloudflare';
    process.env.STORAGE_PRIVATE = 'true';
    process.env.CLOUDFLARE_BUCKET_URL = base;
    process.env.NEXT_PUBLIC_BACKEND_URL = api;
    delete process.env.CLOUDFLARE_ENDPOINT;
    delete process.env.CLOUDFLARE_BUCKETNAME;
    repository = {
      findOwnedPath: jest.fn(async (org, url) =>
        org === 'owner' && url === path ? { id: 'media1', path } : null,
      ),
    };
    storage = {
      signDownloadUrl: jest.fn(async (key, ttl) => `signed:${key}:${ttl}`),
    };
    access = new PrivateMediaAccess(repository, storage);
  });
  afterAll(() => {
    process.env = saved;
  });

  it('projects nested and JSON-encoded attachments without persisting a signature', async () => {
    const input = { results: [{ path }], image: JSON.stringify([{ path }]) };
    expect(await access.response('owner', input)).toEqual({
      results: [{ path: preview }],
      image: JSON.stringify([{ path: preview }]),
    });
    expect(input.results[0].path).toBe(path);
    expect(storage.signDownloadUrl).not.toHaveBeenCalled();
  });

  it('authorizes every redirect, then issues a 15-minute URL', async () => {
    expect(await access.download('owner', 'owned.jpeg')).toBe(
      'signed:owned.jpeg:900',
    );
    await expect(access.download('other', 'owned.jpeg')).rejects.toThrow(
      'Media not found',
    );
    await expect(access.download('owner', '../owned.jpeg')).rejects.toThrow(
      'Media not found',
    );
    expect(storage.signDownloadUrl).toHaveBeenCalledTimes(1);
  });

  it('returns expiring URLs to API clients without requiring a browser cookie', async () => {
    expect(await access.response('owner', { path }, true)).toEqual({ path: 'signed:owned.jpeg:900' });
    expect(await access.response('other', { path }, true)).toEqual({ path });
    expect(storage.signDownloadUrl).toHaveBeenCalledTimes(1);
  });

  it('does not disclose a private preview to a different organization', async () => {
    expect(await access.response('other', { path })).toEqual({ path });
    expect(storage.signDownloadUrl).not.toHaveBeenCalled();
  });

  it('canonicalizes preview URLs and old signatures before saving drafts', async () => {
    expect(
      await access.canonicalize('owner', {
        path: preview,
        image: JSON.stringify([{ path: preview }]),
      }),
    ).toEqual({ path, image: JSON.stringify([{ path }]) });
    expect(
      await access.canonicalize('owner', {
        path: path + '?X-Amz-Signature=expired',
      }),
    ).toEqual({ path });
  });

  it('rejects attempts to save another organization’s URLs', async () => {
    await expect(
      access.canonicalize('other', { path: preview }),
    ).rejects.toThrow('Media does not belong');
    await expect(access.canonicalize('other', { path })).rejects.toThrow(
      'Media does not belong',
    );
    await expect(
      access.canonicalize('owner', {
        path: api + '/media/private/../owned.jpeg',
      }),
    ).rejects.toThrow();
  });

  it('generates fresh publishing URLs on every execution and rejects other owners', async () => {
    await access.forPublishing('owner', [{ path, thumbnail: path }]);
    await access.forPublishing('owner', [{ path }]);
    expect(storage.signDownloadUrl).toHaveBeenCalledTimes(3);
    await expect(access.forPublishing('other', [{ path }])).rejects.toThrow(
      'Media does not belong',
    );
  });

  it('fails closed when signing fails', async () => {
    storage.signDownloadUrl.mockRejectedValue(new Error('storage unavailable'));
    await expect(access.forPublishing('owner', [{ path }])).rejects.toThrow(
      'storage unavailable',
    );
  });

  it.each([
    'https://s3.example.com/private-bucket-evil/owned.jpeg',
    'https://evil.example.com/private-bucket/owned.jpeg',
    base + '/%2fowned.jpeg',
    base + '/%252fowned.jpeg',
    base + '/folder/owned.jpeg',
    'file:///owned.jpeg',
  ])('does not sign an unrelated or malformed path: %s', async (value) => {
    expect(privateMediaKey(value)).toBeUndefined();
    expect(await access.response('owner', value)).toBe(value);
    expect(storage.signDownloadUrl).not.toHaveBeenCalled();
  });

  it('canonicalizes signed URLs on the R2 origin even when previews use a CDN', async () => {
    process.env.CLOUDFLARE_BUCKETNAME = 'bucket';
    process.env.CLOUDFLARE_ACCOUNT_ID = 'account';
    expect(
      await access.canonicalize('owner', {
        path: 'https://bucket.account.r2.cloudflarestorage.com/owned.jpeg?X-Amz-Signature=old',
      }),
    ).toEqual({ path });
  });

  it('preserves dates, buffers and ordinary strings', async () => {
    const value = {
      date: new Date(),
      body: Buffer.from('image'),
      text: '{not JSON',
    };
    const result = await mapMediaUrls(value, async () => 'changed');
    expect(result.date).toBe(value.date);
    expect(result.body).toBe(value.body);
    expect(result.text).toBe(value.text);
  });

  it('leaves public and local installations unchanged', async () => {
    process.env.STORAGE_PRIVATE = 'false';
    expect(await access.response('owner', { path })).toEqual({ path });
    expect(await access.forPublishing('owner', { path })).toEqual({ path });
    process.env.STORAGE_PRIVATE = 'true';
    process.env.STORAGE_PROVIDER = 'local';
    expect(await access.canonicalize('other', { path })).toEqual({ path });
    expect(repository.findOwnedPath).not.toHaveBeenCalled();
  });
});
