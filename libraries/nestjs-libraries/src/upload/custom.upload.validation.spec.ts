import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { CustomFileValidationPipe, getMaxSize } from './custom.upload.validation';

const MB = 1024 * 1024;

const bytes = (...parts: Array<string | number[] | Buffer>) =>
  Buffer.concat(
    parts.map((p) => (typeof p === 'string' ? Buffer.from(p, 'binary') : Buffer.from(p)))
  );

const ftyp = (brand: string) =>
  bytes([0, 0, 0, 0x20], 'ftyp', brand, [0, 0, 0, 0], brand, 'mp42isom', Buffer.alloc(16));

/**
 * Real magic bytes rather than a stubbed sniffer: the whole job of this pipe is
 * to disbelieve the client's declared mimetype, so a test that mocks the
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

const file = (over: Record<string, unknown> = {}) => ({
  fieldname: 'file',
  originalname: 'photo.png',
  buffer: FIXTURES.png,
  mimetype: 'image/png',
  size: 1000,
  ...over,
});

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

describe('CustomFileValidationPipe', () => {
  const pipe = new CustomFileValidationPipe();

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a string', 'org-id'],
    ['a number', 7],
  ])('passes %s straight through', async (_label, value) => {
    await expect(pipe.transform(value)).resolves.toBe(value);
  });

  it('passes a non-file object through untouched', async () => {
    // The pipe is applied at controller level, so every other argument - the
    // org, the body, the query - arrives here too and must survive.
    const body = { id: 'org-1', name: 'Acme' };

    await expect(pipe.transform(body)).resolves.toBe(body);
  });

  it.each([
    ['a missing buffer', file({ buffer: undefined })],
    ['a non-buffer buffer', file({ buffer: 'not a buffer' })],
  ])('rejects %s', async (_label, value) => {
    await expect(pipe.transform(value)).rejects.toThrow('Invalid file upload.');
  });

  it('rejects a file whose bytes are of no recognisable type', async () => {
    await expect(pipe.transform(file({ buffer: FIXTURES.text }))).rejects.toThrow(
      'Unsupported file type.'
    );
  });

  it('rejects an empty buffer as an unrecognisable type', async () => {
    // Buffer.alloc(0) is still a Buffer, so it survives the shape check and is
    // caught one step later by the sniffer having nothing to go on.
    await expect(pipe.transform(file({ buffer: Buffer.alloc(0) }))).rejects.toThrow(
      'Unsupported file type.'
    );
  });

  it.each([
    ['a pdf', FIXTURES.pdf],
    ['a zip', FIXTURES.zip],
  ])('rejects %s however it is labelled', async (_label, buffer) => {
    await expect(pipe.transform(file({ buffer }))).rejects.toThrow(
      'Unsupported file type.'
    );
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
  ])('accepts a real %s and normalises it', async (key, mime, ext) => {
    await expect(
      pipe.transform(file({ buffer: FIXTURES[key as keyof typeof FIXTURES] }))
    ).resolves.toMatchObject({ mimetype: mime, originalname: `photo.${ext}` });
  });

  it('trusts the sniffed type over the declared one', async () => {
    // A .png that is really a PDF must be rejected, and a .txt that is really
    // a PNG must be accepted as a PNG - the client's mimetype is never used.
    await expect(
      pipe.transform(
        file({ buffer: FIXTURES.pdf, mimetype: 'image/png', originalname: 'a.png' })
      )
    ).rejects.toThrow('Unsupported file type.');

    await expect(
      pipe.transform(
        file({ buffer: FIXTURES.png, mimetype: 'text/plain', originalname: 'a.txt' })
      )
    ).resolves.toMatchObject({ mimetype: 'image/png', originalname: 'a.png' });
  });

  it('enforces the cap for the sniffed type, not the declared one', async () => {
    // Declaring video/mp4 must not buy an image the 1 GB video allowance.
    await expect(
      pipe.transform(file({ mimetype: 'video/mp4', size: 11 * MB }))
    ).rejects.toThrow(
      'File size exceeds the maximum allowed size of 10485760 bytes.'
    );
  });

  it('accepts a file exactly at the cap and rejects one byte over', async () => {
    await expect(pipe.transform(file({ size: 10 * MB }))).resolves.toBeTruthy();
    await expect(pipe.transform(file({ size: 10 * MB + 1 }))).rejects.toThrow(
      'File size exceeds'
    );
  });

  it('accepts a large video that would be too big as an image', async () => {
    await expect(
      pipe.transform(file({ buffer: FIXTURES.mp4, size: 500 * MB }))
    ).resolves.toMatchObject({ mimetype: 'video/mp4' });
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
    await expect(pipe.transform(file({ originalname }))).resolves.toMatchObject({
      originalname: expected,
    });
  });

  it('caps the filename stem at 100 characters', async () => {
    const result = await pipe.transform(
      file({ originalname: `${'a'.repeat(250)}.png` })
    );

    expect(result.originalname).toBe(`${'a'.repeat(100)}.png`);
  });

  it('falls back to "upload" when sanitising leaves nothing behind', async () => {
    await expect(pipe.transform(file({ originalname: '.png' }))).resolves.toMatchObject(
      { originalname: 'upload.png' }
    );
  });

  it('mutates and returns the same object multer handed it', async () => {
    const value = file();

    await expect(pipe.transform(value)).resolves.toBe(value);
  });
});
