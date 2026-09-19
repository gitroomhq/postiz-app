import { Readable } from 'stream';
import { describe, expect, it, vi } from 'vitest';
import { MulterStreamEngine } from './multer.stream.engine';

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]),
  Buffer.from('IHDR', 'binary'),
  Buffer.alloc(20),
]);
const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n', 'binary'), Buffer.alloc(20)]);

const build = () => {
  const storage = {
    uploadStream: vi.fn(async (stream: Readable, mimetype: string, ext: string) => {
      for await (const _chunk of stream) {
        // drained like a real upload
      }
      return {
        filename: `stored.${ext}`,
        path: `https://cdn.example.test/stored.${ext}`,
        mimetype,
      };
    }),
    removeFile: vi.fn(async (_path: string) => undefined),
  };
  return { storage, engine: new MulterStreamEngine(storage as never) };
};

/** Runs multer's callback contract as a promise. */
const handle = (
  engine: MulterStreamEngine,
  over: Record<string, unknown> = {},
  bytes = PNG
) =>
  new Promise<Record<string, any>>((resolve, reject) =>
    engine._handleFile(
      {} as never,
      {
        fieldname: 'file',
        originalname: 'photo.png',
        mimetype: 'image/png',
        stream: Readable.from([bytes]),
        ...over,
      } as never,
      (error, info) => (error ? reject(error) : resolve(info!))
    )
  );

describe('MulterStreamEngine._handleFile', () => {
  it('reports the stored key, the public url and the detected type', async () => {
    const { engine } = build();

    await expect(handle(engine)).resolves.toEqual({
      filename: 'stored.png',
      path: 'https://cdn.example.test/stored.png',
      mimetype: 'image/png',
      originalname: 'photo.png',
    });
  });

  it('trusts the sniffed type over the declared one', async () => {
    // A .png that is really a PDF must be rejected, and a .txt that is really
    // a PNG must be accepted as a PNG - the client's mimetype is never used.
    const { engine, storage } = build();

    await expect(
      handle(engine, { mimetype: 'image/png', originalname: 'a.png' }, PDF)
    ).rejects.toThrow('Unsupported file type.');
    expect(storage.uploadStream).not.toHaveBeenCalled();

    await expect(
      handle(engine, { mimetype: 'text/plain', originalname: 'a.txt' })
    ).resolves.toMatchObject({ mimetype: 'image/png', originalname: 'a.png' });
  });

  it.each([
    ['photo.png', 'photo.png'],
    ['photo.jpeg', 'photo.png'],
    ['photo', 'photo.png'],
    ['photo.tar.gz', 'photo.tar.png'],
    ['../../etc/passwd', '.._.._etc_passwd.png'],
    ['a/b\\c.jpg', 'a_b_c.png'],
    ['', 'upload.png'],
  ])('rewrites the filename %s to %s', async (originalname, expected) => {
    const { engine } = build();

    await expect(handle(engine, { originalname })).resolves.toMatchObject({
      originalname: expected,
    });
  });

  it('caps the filename stem at 100 characters', async () => {
    const { engine } = build();

    const result = await handle(engine, {
      originalname: `${'a'.repeat(250)}.png`,
    });

    expect(result.originalname).toBe(`${'a'.repeat(100)}.png`);
  });

  it('falls back to "upload" when sanitising leaves nothing behind', async () => {
    const { engine } = build();

    await expect(
      handle(engine, { originalname: '.png' })
    ).resolves.toMatchObject({ originalname: 'upload.png' });
  });

  it('never lets the sender choose the stored key', async () => {
    const { engine } = build();

    const result = await handle(engine, { originalname: '../../etc/passwd' });

    expect(result.filename).toBe('stored.png');
    expect(result.path).toBe('https://cdn.example.test/stored.png');
  });
});

describe('MulterStreamEngine._removeFile', () => {
  const remove = (engine: MulterStreamEngine, path: string) =>
    new Promise<void>((resolve, reject) =>
      engine._removeFile({} as never, { path } as never, (error) =>
        error ? reject(error) : resolve()
      )
    );

  it('drops the stored file when the request failed after it was stored', async () => {
    const { engine, storage } = build();

    await remove(engine, 'https://cdn.example.test/stored.png');

    expect(storage.removeFile).toHaveBeenCalledWith(
      'https://cdn.example.test/stored.png'
    );
  });

  it('reports a failed removal to multer instead of swallowing it', async () => {
    const { engine, storage } = build();
    storage.removeFile.mockRejectedValue(new Error('bucket unreachable'));

    await expect(remove(engine, 'x.png')).rejects.toThrow('bucket unreachable');
  });
});
