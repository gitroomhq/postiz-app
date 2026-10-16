import { hasLinks, stripLinks } from './strip.links';

describe('hasLinks', () => {
  it('detects a full url', () => {
    expect(hasLinks('new post on https://postiz.com/blog')).toBe(true);
  });

  it('detects a bare domain, x linkifies those as well', () => {
    expect(hasLinks('new post on postiz.com')).toBe(true);
  });

  it('detects a bare domain with a path', () => {
    expect(hasLinks('shortened at bit.ly/abc123')).toBe(true);
  });

  it('does not treat an email address as a link', () => {
    expect(hasLinks('write to me@postiz.com')).toBe(false);
  });

  it('does not detect a dotted path as a link', () => {
    expect(hasLinks('the file is in src/utils.ts')).toBe(false);
  });

  it('handles empty and missing values', () => {
    expect(hasLinks('')).toBe(false);
    expect(hasLinks(undefined)).toBe(false);
    expect(hasLinks(null)).toBe(false);
  });
});

describe('stripLinks', () => {
  it('removes a url and the space it leaves behind', () => {
    expect(stripLinks('new post on https://postiz.com/blog')).toBe('new post on');
  });

  it('removes every url in the text', () => {
    expect(stripLinks('see https://a.com and https://b.com')).toBe('see and');
  });

  it('removes a bare domain', () => {
    expect(stripLinks('visit postiz.com for more')).toBe('visit for more');
  });

  it('removes an anchor whose text was the link', () => {
    expect(
      stripLinks('<a href="https://postiz.com">https://postiz.com</a>')
    ).toBe('');
  });

  it('keeps text without links as is', () => {
    expect(stripLinks('just a normal post')).toBe('just a normal post');
  });

  it('returns an empty string for empty and missing values', () => {
    expect(stripLinks('')).toBe('');
    expect(stripLinks(undefined)).toBe('');
    expect(stripLinks(null)).toBe('');
  });
});
