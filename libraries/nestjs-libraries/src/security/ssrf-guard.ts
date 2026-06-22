import { lookup } from 'dns/promises';
import { isIP } from 'net';

/**
 * Blocks outbound requests to destinations that should never be reachable
 * from server-initiated webhooks/redirects: loopback, link-local (this
 * covers the AWS/GCP/Azure cloud metadata endpoint 169.254.169.254),
 * private RFC1918 ranges, and the unspecified address.
 *
 * Used to validate user/partner-supplied `webhookUrl` values before they
 * are persisted and later fetched server-side (classic SSRF vector).
 */

const PRIVATE_IPV4_RANGES: Array<{ base: number; bits: number }> = [
  ip4Range('10.0.0.0', 8),
  ip4Range('127.0.0.0', 8), // loopback
  ip4Range('169.254.0.0', 16), // link-local / cloud metadata
  ip4Range('172.16.0.0', 12),
  ip4Range('192.168.0.0', 16),
  ip4Range('0.0.0.0', 8), // "this network" / unspecified
];

function ip4ToInt(ip: string): number {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  return (
    ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
  );
}

function ip4Range(base: string, bits: number) {
  return { base: ip4ToInt(base), bits };
}

function isPrivateIPv4(ip: string): boolean {
  const value = ip4ToInt(ip);
  return PRIVATE_IPV4_RANGES.some(({ base, bits }) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (value & mask) === (base & mask);
  });
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // ::1 loopback
  if (normalized === '::1') {
    return true;
  }

  // :: unspecified
  if (normalized === '::') {
    return true;
  }

  // fe80::/10 link-local (also covers metadata services reachable via IPv6
  // link-local on some cloud providers)
  if (/^fe[89ab][0-9a-f]:/.test(normalized)) {
    return true;
  }

  // fc00::/7 unique local (private)
  if (/^f[cd][0-9a-f]{2}:/.test(normalized)) {
    return true;
  }

  // IPv4-mapped IPv6 addresses (::ffff:a.b.c.d) -> check the embedded IPv4
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) {
    return isPrivateIPv4(mapped[1]);
  }

  return false;
}

function isPrivateOrLoopbackIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    return isPrivateIPv4(ip);
  }
  if (version === 6) {
    return isPrivateIPv6(ip);
  }
  // Not a recognizable IP literal — treat as unsafe (fail closed).
  return true;
}

/**
 * Resolves a webhook/redirect URL and returns whether it is safe to fetch
 * server-side: must be https, and must not resolve to a loopback,
 * link-local, private, or unspecified address.
 */
export async function isSafeWebhookUrl(rawUrl: string): Promise<boolean> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') {
    return false;
  }

  const hostname = parsed.hostname;

  // If the hostname is itself a literal IP, validate it directly.
  if (isIP(hostname)) {
    return !isPrivateOrLoopbackIp(hostname);
  }

  // Otherwise resolve the hostname and validate every resolved address.
  // Fail closed: if resolution fails, treat the URL as unsafe.
  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (!records.length) {
      return false;
    }
    return records.every((record) => !isPrivateOrLoopbackIp(record.address));
  } catch {
    return false;
  }
}

/**
 * Throwing variant for call sites that want to bail out via their existing
 * try/catch error handling instead of branching on a boolean.
 */
export async function assertSafeWebhookUrl(rawUrl: string): Promise<void> {
  const safe = await isSafeWebhookUrl(rawUrl);
  if (!safe) {
    throw new Error('Unsafe webhook URL');
  }
}
