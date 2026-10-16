import { countLength, textSlicer, weightedLength } from './count.length';

describe('countLength', () => {
  it('counts plain characters for providers without their own rules', () => {
    expect(countLength('linkedin', 'hello')).toBe(5);
  });

  it('counts emoji as two characters on providers counting code units', () => {
    expect(countLength('linkedin', '👍')).toBe(2);
  });

  it('counts bytes for threads', () => {
    expect(countLength('threads', 'hello')).toBe(5);
    expect(countLength('threads', '👍')).toBe(4);
  });

  it('counts the weighted length for x', () => {
    expect(countLength('x', 'hello')).toBe(5);
  });

  it('counts every url as 23 characters on x, whatever its real length', () => {
    // a = 1, space = 1, url = 23, space = 1, b = 1
    expect(countLength('x', 'a https://postiz.com/a/very/long/path b')).toBe(27);
  });
});

describe('weightedLength', () => {
  it('weighs a url as 23 characters', () => {
    expect(weightedLength('https://example.com/some/very/long/path')).toBe(23);
  });
});

describe('textSlicer', () => {
  it('hands the whole range to providers that do not slice', () => {
    expect(textSlicer('linkedin', 3000, 'a long post')).toEqual({
      start: 0,
      end: 3000,
    });
  });

  it('keeps the requested end when the x post fits', () => {
    expect(textSlicer('x', 280, 'a short post')).toEqual({ start: 0, end: 280 });
  });

  it('cuts an x post that is too long at the last character that fits', () => {
    // twitter-text reports the last valid character, so a 280 limit gives 279
    expect(textSlicer('x', 280, 'a'.repeat(400))).toEqual({
      start: 0,
      end: 279,
    });
  });

  it('keeps the full range when the x post is exactly at the limit', () => {
    expect(textSlicer('x', 280, 'a'.repeat(280))).toEqual({
      start: 0,
      end: 280,
    });
  });
});
