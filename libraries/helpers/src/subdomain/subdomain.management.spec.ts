import { describe, expect, it } from 'vitest';
import { getCookieUrlFromDomain } from './subdomain.management';

/**
 * This decides the `domain` of the auth, track and fbclid cookies. Getting it
 * wrong does not throw - it silently issues a cookie the browser will not send
 * back, which reads as "login does nothing".
 */
describe('getCookieUrlFromDomain', () => {
  it.each([
    ['https://postiz.com', '.postiz.com'],
    ['https://app.postiz.com', '.postiz.com'],
    ['https://deep.nested.app.postiz.com', '.postiz.com'],
    ['http://postiz.com', '.postiz.com'],
    ['https://postiz.com/some/path?q=1', '.postiz.com'],
    ['postiz.com', '.postiz.com'],
    ['app.postiz.com', '.postiz.com'],
  ])('maps %s to %s', (input, expected) => {
    expect(getCookieUrlFromDomain(input)).toBe(expected);
  });

  it('keeps the registrable domain of a multi-level public suffix', () => {
    // The reason tldts is used instead of a split('.').slice(-2): under
    // ".co.uk" the registrable domain is three labels, not two, and a naive
    // split would emit ".co.uk" - a cookie every site on .co.uk would receive.
    expect(getCookieUrlFromDomain('https://app.postiz.co.uk')).toBe('.postiz.co.uk');
    expect(getCookieUrlFromDomain('https://postiz.co.uk')).toBe('.postiz.co.uk');
    expect(getCookieUrlFromDomain('https://a.b.postiz.com.au')).toBe('.postiz.com.au');
  });

  it.each([
    ['http://localhost:4200', 'localhost'],
    ['http://localhost', 'localhost'],
    ['localhost', 'localhost'],
  ])('returns the bare hostname for %s, which has no registrable domain', (input, expected) => {
    expect(getCookieUrlFromDomain(input)).toBe(expected);
  });

  it('returns the bare host for an IP address', () => {
    // An IP has no registrable domain, so a leading dot would be invalid.
    expect(getCookieUrlFromDomain('http://127.0.0.1:3000')).toBe('127.0.0.1');
  });

  it('ignores the port when deriving the domain', () => {
    expect(getCookieUrlFromDomain('https://app.postiz.com:8443')).toBe('.postiz.com');
  });

  it('never returns a bare public suffix', () => {
    // ".com" or ".co.uk" as a cookie domain would be rejected by every browser
    // and is the failure mode worth guarding against explicitly.
    for (const input of [
      'https://postiz.com',
      'https://app.postiz.co.uk',
      'https://a.b.c.postiz.com.au',
    ]) {
      const result = getCookieUrlFromDomain(input);
      expect(result).not.toBe('.com');
      expect(result).not.toBe('.co.uk');
      expect(result).not.toBe('.com.au');
    }
  });
});
