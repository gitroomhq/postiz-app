import { describe, expect, it } from 'vitest';
import { hasLinks, stripLinks } from './strip.links';

describe('hasLinks', () => {
  it('detects a scheme-qualified URL', () => {
    expect(hasLinks('read https://postiz.com/blog now')).toBe(true);
  });

  it('detects a bare domain, which X linkifies just the same', () => {
    expect(hasLinks('check postiz.com')).toBe(true);
    expect(hasLinks('check bit.ly/abc')).toBe(true);
  });

  it('does not treat an email address as a link', () => {
    expect(hasLinks('mail me at user@domain.com')).toBe(false);
  });

  it('does not treat a filename as a link', () => {
    expect(hasLinks('open report.txt')).toBe(false);
    expect(hasLinks('see notes.docx')).toBe(false);
  });

  it('returns false for empty input', () => {
    expect(hasLinks('')).toBe(false);
    expect(hasLinks(null)).toBe(false);
    expect(hasLinks(undefined)).toBe(false);
  });
});

describe('stripLinks', () => {
  it('removes a URL and collapses the gap it left', () => {
    expect(stripLinks('go to https://postiz.com now')).toBe('go to now');
  });

  it('removes the empty anchor a stripped link leaves behind', () => {
    expect(
      stripLinks('go to <a href="https://postiz.com">https://postiz.com</a> now')
    ).toBe('go to now');
  });

  it('keeps text that only looks like a link', () => {
    expect(stripLinks('mail user@domain.com')).toBe('mail user@domain.com');
  });

  it('returns an empty string for empty input', () => {
    expect(stripLinks(null)).toBe('');
    expect(stripLinks(undefined)).toBe('');
  });
});
