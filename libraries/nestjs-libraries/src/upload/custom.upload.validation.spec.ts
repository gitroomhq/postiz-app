import { BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';
import { describe, expect, it, vi } from 'vitest';
import {
  getMaxSize,
  maxSizeStream,
  uploadStreamToStorage,
} from './custom.upload.validation';

const MB = 1024 * 1024;

const bytes = (...parts: Array<string | number[] | Buffer>) =>
  Buffer.concat(
    parts.map((p) => (typeof p === 'string' ? Buffer.from(p, 'binary') : Buffer.from(p)))
  );

const ftyp = (brand: string) =>
  bytes([0, 0, 0, 0x20], 'ftyp', brand, [0, 0, 0, 0], brand, 'mp42isom', Buffer.alloc(16));

/**
 * Real magic bytes rather than a stubbed sniffer: the whole job of this code is
 * to disbelieve whatever type the sender claims, so a test that mocks the
 * detection away is testing nothing.
 */
const FIXTURES = {
  png: bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], [0, 0, 0, 0x0d], 'IHDR', Buffer.alloc(20)),
  jpeg: bytes([0xff, 0xd8, 0xff, 0xe0], [0, 0x10], 'JFIF\0', Buffer.alloc(20)),
  gif: bytes('GIF89a', Buffer.alloc(20)),
  webp: bytes('RIFF', [0x1a, 0, 0, 0], 'WEBPVP8 ', Buffer.alloc(20)),
  bmp: bytes('BM', Buffer.alloc(30)),
  tiff: bytes([0x49, 0x49, 0x2a, 0x00], Buffer.alloc(30)),
  avif: ftyp('avif'),
  mp4: ftyp('isom'),
  pdf: bytes('%PDF-1.4\n', Buffer.alloc(20)),
  zip: bytes([0x50, 0x4b, 0x03, 0x04], Buffer.alloc(30)),
  text: bytes('hello world, entirely unremarkable text'),
};

/** A body the way it arrives: a web stream, optionally in several chunks. */
const streamOf = (...chunks: Buffer[]) =>
  Readable.toWeb(Readable.from(chunks)) as unknown as ReadableStream;

const padded = (start: Buffer, size: number) =>
  Buffer.concat([start, Buffer.alloc(size - start.length)]);

/**
 * Stands in for the bucket. It drains the body like a real upload does, because
 * the size cap only acts while the bytes are flowing.
 */
const fakeStorage = () => {
  const received = { bytes: 0 };
  const uploadStream = vi.fn(
    async (stream: Readable, mimetype: string, ext: string) => {
      for await (const chunk of stream) {
        received.bytes += (chunk as Buffer).length;
      }
      return {
        filename: `stored.${ext}`,
        path: `https://cdn.example.test/stored.${ext}`,
        mimetype,
      };
    }
  );
  return { storage: { uploadStream } as never, uploadStream, received };
};

describe('getMaxSize', () => {
  it('allows 10 MB for any image type', () => {
    expect(getMaxSize('image/png')).toBe(10 * MB);
    expect(getMaxSize('image/gif')).toBe(10 * MB);
    expect(getMaxSize('image/tiff')).toBe(10 * MB);
  });

  it('allows 1 GB for any video type', () => {
    expect(getMaxSize('video/mp4')).toBe(1024 * MB);
  });

  it('refuses to produce a cap for anything else', () => {
    expect(() => getMaxSize('application/pdf')).toThrow(BadRequestException);
    expect(() => getMaxSize('')).toThrow(BadRequestException);
  });
});

describe('maxSizeStream', () => {
  const drain = async (stream: Readable) => {
    let total = 0;
    for await (const chunk of stream) {
      total += (chunk as Buffer).length;
    }
    return total;
  };

  it('lets a body through that stays within the cap', async () => {
    const body = Readable.from([Buffer.alloc(4), Buffer.alloc(6)]).pipe(
      maxSizeStream(10)
    );

    await expect(drain(body)).resolves.toBe(10);
  });

  it('fails the stream on the chunk that crosses the cap', async () => {
    const body = Readable.from([Buffer.alloc(6), Buffer.alloc(5)]).pipe(
      maxSizeStream(10)
    );

    await expect(drain(body)).rejects.toThrow('File is too large.');
  });
});

describe('uploadStreamToStorage', () => {
  it('rejects a body whose bytes are of no recognisable type', async () => {
    const { storage, uploadStream } = fakeStorage();

    await expect(
      uploadStreamToStorage(storage, streamOf(FIXTURES.text))
    ).rejects.toThrow('Unsupported file type.');
    expect(uploadStream).not.toHaveBeenCalled();
  });

  it('rejects an empty body', async () => {
    const { storage, uploadStream } = fakeStorage();

    await expect(
      uploadStreamToStorage(storage, streamOf(Buffer.alloc(0)))
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(uploadStream).not.toHaveBeenCalled();
  });

  it.each([
    ['a pdf', FIXTURES.pdf],
    ['a zip', FIXTURES.zip],
  ])('rejects %s before anything reaches storage', async (_label, buffer) => {
    const { storage, uploadStream } = fakeStorage();

    await expect(
      uploadStreamToStorage(storage, streamOf(buffer))
    ).rejects.toThrow('Unsupported file type.');
    expect(uploadStream).not.toHaveBeenCalled();
  });

  it.each([
    ['png', 'image/png', 'png'],
    ['jpeg', 'image/jpeg', 'jpg'],
    ['gif', 'image/gif', 'gif'],
    ['webp', 'image/webp', 'webp'],
    ['bmp', 'image/bmp', 'bmp'],
    ['tiff', 'image/tiff', 'tif'],
    ['avif', 'image/avif', 'avif'],
    ['mp4', 'video/mp4', 'mp4'],
  ])('stores a real %s under its detected type', async (key, mime, ext) => {
    const { storage, uploadStream } = fakeStorage();

    await expect(
      uploadStreamToStorage(
        storage,
        streamOf(FIXTURES[key as keyof typeof FIXTURES])
      )
    ).resolves.toMatchObject({ mimetype: mime, ext });
    expect(uploadStream).toHaveBeenCalledWith(expect.anything(), mime, ext);
  });

  it('hands storage every byte, including the ones read to detect the type', async () => {
    const { storage, received } = fakeStorage();
    const body = padded(FIXTURES.png, 64 * 1024);

    await uploadStreamToStorage(
      storage,
      streamOf(body.subarray(0, 10), body.subarray(10))
    );

    expect(received.bytes).toBe(body.length);
  });

  it('refuses a declared length over the cap of the detected type', async () => {
    const { storage, uploadStream } = fakeStorage();

    await expect(
      uploadStreamToStorage(storage, streamOf(FIXTURES.png), 11 * MB)
    ).rejects.toThrow('File is too large.');
    expect(uploadStream).not.toHaveBeenCalled();
  });

  it('accepts a declared length a video may have but an image may not', async () => {
    const { storage } = fakeStorage();

    await expect(
      uploadStreamToStorage(storage, streamOf(FIXTURES.mp4), 500 * MB)
    ).resolves.toMatchObject({ mimetype: 'video/mp4' });
  });

  it('accepts an image exactly at the cap and rejects one byte over', async () => {
    await expect(
      uploadStreamToStorage(
        fakeStorage().storage,
        streamOf(padded(FIXTURES.png, 10 * MB))
      )
    ).resolves.toMatchObject({ mimetype: 'image/png' });

    await expect(
      uploadStreamToStorage(
        fakeStorage().storage,
        streamOf(padded(FIXTURES.png, 10 * MB + 1))
      )
    ).rejects.toThrow('File is too large.');
  });

  it('enforces the cap on the bytes, not on the length the sender gave', async () => {
    // A missing or lying Content-Length must not buy an unbounded upload.
    await expect(
      uploadStreamToStorage(
        fakeStorage().storage,
        streamOf(padded(FIXTURES.png, 10 * MB + 1)),
        1000
      )
    ).rejects.toThrow('File is too large.');
  });

  it('passes a storage failure on as it is', async () => {
    const { storage, uploadStream } = fakeStorage();
    uploadStream.mockRejectedValue(new Error('bucket unreachable'));

    await expect(
      uploadStreamToStorage(storage, streamOf(FIXTURES.png))
    ).rejects.toThrow('bucket unreachable');
  });
});
