import { frameSize, parseVideoEdit } from './video.edit';

const clip = { mediaId: 'clip-1', in: 0, out: 10, muted: false };

describe('parseVideoEdit', () => {
  it('keeps a clip, the overlays with their stored pictures, and the music track', () => {
    const parsed = parseVideoEdit(
      {
        clips: [clip],
        overlays: [
          { start: 1, end: 4, path: '/etc/passwd' },
          { start: 0, end: 99 },
        ],
        music: { mediaId: 'song', in: 2, start: 1, volume: 40 },
        shape: '9:16',
        focusX: 0.2,
        focusY: 0.8,
      },
      ['https://cdn/one.png', 'https://cdn/two.png']
    );
    expect('edit' in parsed && parsed.edit).toMatchObject({
      shape: '9:16',
      focusX: 0.2,
      focusY: 0.8,
      music: { mediaId: 'song', in: 2, start: 1, volume: 40 },
      overlays: [
        { start: 1, end: 4, path: 'https://cdn/one.png' },
        { start: 0, end: 10, path: 'https://cdn/two.png' },
      ],
    });
  });

  it('rejects a clip shorter than 0.1 seconds and a timeline past 15 minutes', () => {
    expect(parseVideoEdit({ clips: [{ ...clip, out: 0.05 }] })).toEqual({
      error: 'A clip is shorter than 0.1 seconds',
    });
    expect(parseVideoEdit({ clips: [{ ...clip, out: 901 }] })).toEqual({
      error: 'The edit is longer than 15 minutes',
    });
  });

  it('rejects an overlay without its picture, with no length, or past the cap', () => {
    expect(parseVideoEdit({ clips: [clip], overlays: [{ start: 0, end: 1 }] })).toEqual({
      error: 'Every layer needs its picture',
    });
    expect(
      parseVideoEdit({ clips: [clip], overlays: [{ start: 2, end: 2 }] }, ['a.png'])
    ).toEqual({ error: 'A layer has timing outside the video' });
    const many = Array.from({ length: 41 }, () => ({ start: 0, end: 1 }));
    expect(parseVideoEdit({ clips: [clip], overlays: many })).toEqual({
      error: 'Use at most 40 layers',
    });
  });
});

describe('frameSize', () => {
  it('uses the fixed social sizes', () => {
    expect(frameSize('9:16', { width: 100, height: 100 })).toEqual({
      width: 1080,
      height: 1920,
    });
    expect(frameSize('16:9', { width: 100, height: 100 })).toEqual({
      width: 1920,
      height: 1080,
    });
  });

  it('shrinks a large original and keeps a small one', () => {
    expect(frameSize('original', { width: 3840, height: 2160 })).toEqual({
      width: 1920,
      height: 1080,
    });
    expect(frameSize('original', { width: 640, height: 360 })).toEqual({
      width: 640,
      height: 360,
    });
  });
});
