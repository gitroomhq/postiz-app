import { describe, expect, it } from 'vitest';
import { textSlicer, weightedLength } from './count.length';

describe('weightedLength', () => {
  it('counts plain ASCII one-for-one', () => {
    expect(weightedLength('hello')).toBe(5);
  });

  it('weighs CJK characters more heavily than their character count', () => {
    // This is what makes a 200-character Chinese post "too long" for X where
    // the same count of ASCII is not.
    expect(weightedLength('你好')).toBeGreaterThan('你好'.length);
  });

  it('normalises every URL to the same transformed length', () => {
    const short = weightedLength('https://a.com');
    const long = weightedLength(
      'https://a-very-long-domain-name.example.com/with/a/very/long/path?and=query'
    );

    expect(short).toBe(long);
  });

  it('returns 0 for an empty string', () => {
    expect(weightedLength('')).toBe(0);
  });
});

describe('textSlicer', () => {
  it('returns the requested end verbatim for non-x providers', () => {
    expect(textSlicer('linkedin', 300, 'x'.repeat(5000))).toEqual({
      start: 0,
      end: 300,
    });
  });

  it('keeps the requested end for an x post that fits', () => {
    expect(textSlicer('x', 280, 'still short').end).toBe(280);
  });

  it('falls back to the valid range end for an x post that does not fit', () => {
    const { end } = textSlicer('x', 280, 'a'.repeat(400));

    expect(end).toBeLessThan(280);
    expect(end).toBeGreaterThan(0);
  });
});
