import { frameSize, parseVideoEdit } from './video.edit';

const clip = { mediaId: 'clip-1', in: 0, out: 10, muted: false };

describe('parseVideoEdit', () => {
  it('keeps a clip, a title and the music track', () => {
    const parsed = parseVideoEdit({
      clips: [clip],
      titles: [
        {
          text: '  Hello  ',
          start: 1,
          end: 4,
          x: 0.5,
          y: 0.2,
          font: 'Inter',
          size: 64.4,
          color: '#FF00AA',
          align: 'left',
        },
      ],
      music: { mediaId: 'song', in: 2, start: 1, volume: 40 },
      shape: '9:16',
      focusX: 0.2,
      focusY: 0.8,
    });
    expect('edit' in parsed && parsed.edit).toMatchObject({
      shape: '9:16',
      focusX: 0.2,
      focusY: 0.8,
      music: { mediaId: 'song', in: 2, start: 1, volume: 40 },
    });
    if ('edit' in parsed) {
      expect(parsed.edit.titles[0]).toMatchObject({
        text: 'Hello',
        size: 64,
        color: '#ff00aa',
        align: 'left',
      });
    }
  });

  it('rejects a clip shorter than 0.1 seconds and a timeline past 15 minutes', () => {
    expect(parseVideoEdit({ clips: [{ ...clip, out: 0.05 }] })).toEqual({
      error: 'A clip is shorter than 0.1 seconds',
    });
    expect(parseVideoEdit({ clips: [{ ...clip, out: 901 }] })).toEqual({
      error: 'The edit is longer than 15 minutes',
    });
  });

  it('drops an empty title and rejects a colour that is not hex', () => {
    const empty = parseVideoEdit({
      clips: [clip],
      titles: [{ text: '   ', start: 0, end: 1 }],
    });
    expect('edit' in empty && empty.edit.titles).toEqual([]);
    expect(
      parseVideoEdit({
        clips: [clip],
        titles: [
          {
            text: 'Hi',
            start: 0,
            end: 1,
            x: 0.5,
            y: 0.5,
            font: 'Inter',
            size: 40,
            color: 'red',
            align: 'center',
          },
        ],
      })
    ).toEqual({ error: 'A title has a font or colour this editor cannot use' });
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
