import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:dns/promises', () => ({
  default: { lookup: vi.fn() },
  lookup: vi.fn(),
}));

import dns from 'node:dns/promises';
import {
  IsSafeWebhookUrlConstraint,
  isBlockedIPv4,
  isBlockedIPv6,
  isBlockedIp,
  isSafePublicHttpsUrl,
} from './webhook.url.validator';

const lookup = dns.lookup as unknown as ReturnType<typeof vi.fn>;

const resolvesTo = (...addresses: string[]) => {
  lookup.mockResolvedValue(
    addresses.map((address) => ({
      address,
      family: address.includes(':') ? 6 : 4,
    }))
  );
};

describe('isBlockedIPv4', () => {
  it.each([
    ['0.0.0.0', '0.0.0.0/8'],
    ['10.1.2.3', '10.0.0.0/8'],
    ['127.0.0.1', 'loopback'],
    ['169.254.169.254', 'cloud metadata'],
    ['172.16.0.1', 'start of 172.16.0.0/12'],
    ['172.31.255.254', 'end of 172.16.0.0/12'],
    ['192.168.1.1', '192.168.0.0/16'],
    ['100.64.0.1', 'CGNAT'],
    ['100.127.255.255', 'end of CGNAT'],
    ['198.18.0.1', 'benchmarking'],
    ['198.19.255.255', 'end of benchmarking'],
    ['224.0.0.1', 'multicast'],
    ['255.255.255.255', 'reserved'],
  ])('blocks %s (%s)', (ip) => {
    expect(isBlockedIPv4(ip)).toBe(true);
  });

  it.each([
    ['8.8.8.8'],
    ['1.1.1.1'],
    ['172.15.255.255'],
    ['172.32.0.1'],
    ['100.63.255.255'],
    ['100.128.0.1'],
    ['198.17.255.255'],
    ['198.20.0.1'],
    ['223.255.255.255'],
  ])('allows public %s', (ip) => {
    expect(isBlockedIPv4(ip)).toBe(false);
  });

  it('blocks anything it cannot parse as numbers', () => {
    expect(isBlockedIPv4('not-an-ip')).toBe(true);
    expect(isBlockedIPv4('')).toBe(true);
  });
});

describe('isBlockedIPv6', () => {
  it.each([
    ['::1'],
    ['::'],
    ['fe80::1'],
    ['fc00::1'],
    ['fd12:3456::1'],
    ['ff02::1'],
    ['FE80::1'],
  ])('blocks %s', (ip) => {
    expect(isBlockedIPv6(ip)).toBe(true);
  });

  it('allows a public v6 address', () => {
    expect(isBlockedIPv6('2606:4700:4700::1111')).toBe(false);
  });
});

describe('isBlockedIp', () => {
  it('unwraps an IPv4-mapped IPv6 address before judging it', () => {
    expect(isBlockedIp('::ffff:127.0.0.1')).toBe(true);
    expect(isBlockedIp('::ffff:169.254.169.254')).toBe(true);
    expect(isBlockedIp('::ffff:8.8.8.8')).toBe(false);
  });

  it('blocks anything that is not an IP at all', () => {
    expect(isBlockedIp('example.com')).toBe(true);
    expect(isBlockedIp('')).toBe(true);
  });
});

describe('isSafePublicHttpsUrl', () => {
  beforeEach(() => {
    lookup.mockReset();
  });

  it.each([
    ['a non-string', 123],
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['whitespace only', '   '],
    ['an unparseable url', 'not a url'],
  ])('rejects %s without resolving anything', async (_label, value) => {
    await expect(isSafePublicHttpsUrl(value)).resolves.toBe(false);
    expect(lookup).not.toHaveBeenCalled();
  });

  it.each([
    ['http', 'http://example.com/hook'],
    ['file', 'file:///etc/passwd'],
    ['gopher', 'gopher://example.com'],
    ['javascript', 'javascript:alert(1)'],
  ])('rejects the %s scheme', async (_label, url) => {
    await expect(isSafePublicHttpsUrl(url)).resolves.toBe(false);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('rejects localhost by name before any resolution', async () => {
    await expect(isSafePublicHttpsUrl('https://localhost/hook')).resolves.toBe(
      false
    );
    await expect(isSafePublicHttpsUrl('https://LOCALHOST/hook')).resolves.toBe(
      false
    );
    expect(lookup).not.toHaveBeenCalled();
  });

  it('judges a literal IP without resolving it', async () => {
    await expect(
      isSafePublicHttpsUrl('https://169.254.169.254/latest/meta-data/')
    ).resolves.toBe(false);
    await expect(isSafePublicHttpsUrl('https://8.8.8.8/hook')).resolves.toBe(
      true
    );
    expect(lookup).not.toHaveBeenCalled();
  });

  it('strips the brackets from a literal IPv6 host', async () => {
    await expect(isSafePublicHttpsUrl('https://[::1]/hook')).resolves.toBe(
      false
    );
    await expect(
      isSafePublicHttpsUrl('https://[2606:4700:4700::1111]/hook')
    ).resolves.toBe(true);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('accepts a hostname that resolves entirely to public addresses', async () => {
    resolvesTo('93.184.216.34', '2606:2800:220:1::1');

    await expect(
      isSafePublicHttpsUrl('https://example.com/hook')
    ).resolves.toBe(true);
    expect(lookup).toHaveBeenCalledWith('example.com', { all: true });
  });

  it('rejects a hostname that resolves to a private address', async () => {
    resolvesTo('127.0.0.1');

    await expect(
      isSafePublicHttpsUrl('https://rebind.example.com/hook')
    ).resolves.toBe(false);
  });

  it('rejects when only one of several records is private', async () => {
    // The whole point of `all: true`: a host that answers with one public and
    // one private record is still a way into the private network.
    resolvesTo('93.184.216.34', '10.0.0.5');

    await expect(
      isSafePublicHttpsUrl('https://split.example.com/hook')
    ).resolves.toBe(false);
  });

  it('rejects a hostname that resolves to nothing', async () => {
    lookup.mockResolvedValue([]);

    await expect(isSafePublicHttpsUrl('https://void.example.com')).resolves.toBe(
      false
    );
  });

  it('rejects when resolution throws', async () => {
    lookup.mockRejectedValue(new Error('ENOTFOUND'));

    await expect(
      isSafePublicHttpsUrl('https://missing.example.com')
    ).resolves.toBe(false);
  });

  it('lowercases the hostname before resolving', async () => {
    resolvesTo('93.184.216.34');

    await expect(
      isSafePublicHttpsUrl('https://EXAMPLE.COM/hook')
    ).resolves.toBe(true);
    expect(lookup).toHaveBeenCalledWith('example.com', { all: true });
  });

  it('ignores credentials, port, path and query when picking the host', async () => {
    resolvesTo('93.184.216.34');

    await expect(
      isSafePublicHttpsUrl('https://user:pass@example.com:8443/a/b?c=d#e')
    ).resolves.toBe(true);
    expect(lookup).toHaveBeenCalledWith('example.com', { all: true });
  });

  it('is not fooled by a private host in the userinfo section', async () => {
    // "https://127.0.0.1@evil.example.com" resolves evil.example.com, not the
    // loopback that a naive substring check would see.
    resolvesTo('10.0.0.1');

    await expect(
      isSafePublicHttpsUrl('https://127.0.0.1@evil.example.com/hook')
    ).resolves.toBe(false);
    expect(lookup).toHaveBeenCalledWith('evil.example.com', { all: true });
  });
});

describe('IsSafeWebhookUrlConstraint', () => {
  beforeEach(() => {
    lookup.mockReset();
  });

  it('delegates to isSafePublicHttpsUrl', async () => {
    resolvesTo('93.184.216.34');
    const constraint = new IsSafeWebhookUrlConstraint();

    await expect(
      constraint.validate('https://example.com/hook', {} as never)
    ).resolves.toBe(true);
    await expect(
      constraint.validate('http://example.com/hook', {} as never)
    ).resolves.toBe(false);
  });

  it('explains itself without leaking the submitted value', () => {
    const message = new IsSafeWebhookUrlConstraint().defaultMessage(
      {} as never
    );

    expect(message).toContain('public HTTPS URL');
    expect(message).toContain('link-local');
  });
});
