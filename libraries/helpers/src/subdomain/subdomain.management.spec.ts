import { getCookieUrlFromDomain } from './subdomain.management';

describe('getCookieUrlFromDomain', () => {
  it.each([
    [
      'https://postiz-production-ab12.up.railway.app',
      'postiz-production-ab12.up.railway.app',
    ],
    [
      'https://another-tenant.up.railway.app',
      'another-tenant.up.railway.app',
    ],
    ['https://social.example.com', '.example.com'],
    ['http://localhost:4200', 'localhost'],
    ['http://127.0.0.1:4200', '127.0.0.1'],
    ['https://tenant.up.railway.app.example.com', '.example.com'],
    ['https://tenant.up.railway.application.com', '.application.com'],
  ])('scopes cookies for %s to %s', (url, expected) => {
    expect(getCookieUrlFromDomain(url)).toBe(expected);
  });
});
