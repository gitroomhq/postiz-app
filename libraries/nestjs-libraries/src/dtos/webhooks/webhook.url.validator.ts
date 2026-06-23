import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { URL } from 'node:url';
import dns from 'node:dns/promises';
import net from 'node:net';

export function isBlockedIPv4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);

  if ([a, b].some((n) => Number.isNaN(n))) return true;

  return (
    a === 0 || // 0.0.0.0/8
    a === 10 || // 10.0.0.0/8
    a === 127 || // 127.0.0.0/8
    (a === 169 && b === 254) || // 169.254.0.0/16
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
    (a === 192 && b === 168) || // 192.168.0.0/16
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10
    (a === 198 && (b === 18 || b === 19)) || // 198.18.0.0/15
    a >= 224 // multicast/reserved
  );
}

export function isBlockedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  return (
    normalized === '::1' || // loopback
    normalized === '::' || // unspecified
    normalized.startsWith('fe80:') || // link-local
    normalized.startsWith('fc') || // unique local fc00::/7
    normalized.startsWith('fd') || // unique local fd00::/7
    normalized.startsWith('ff') // multicast
  );
}

function parseIpv4Octets(ip: string): number[] | undefined {
  const octets = ip.split('.').map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return undefined;
  }
  return octets;
}

function normalizeIpv6Hextets(ip: string): string[] | undefined {
  const normalized = ip.toLowerCase();
  if ((normalized.match(/::/g) || []).length > 1) {
    return undefined;
  }

  const convertIpv4Tail = (parts: string[]): string[] | undefined => {
    const result = [...parts];
    const last = result.at(-1);
    if (!last?.includes('.')) {
      return result;
    }

    const octets = parseIpv4Octets(last);
    if (!octets) {
      return undefined;
    }

    result.splice(
      -1,
      1,
      ((octets[0] << 8) | octets[1]).toString(16),
      ((octets[2] << 8) | octets[3]).toString(16)
    );
    return result;
  };

  const [headPart, tailPart] = normalized.split('::');
  const head = convertIpv4Tail(headPart ? headPart.split(':') : []);
  const tail = convertIpv4Tail(tailPart ? tailPart.split(':') : []);
  if (!head || !tail) {
    return undefined;
  }

  const missing = 8 - head.length - tail.length;
  if ((tailPart === undefined && missing !== 0) || missing < 0) {
    return undefined;
  }

  const hextets = [...head, ...Array(missing).fill('0'), ...tail];
  if (hextets.length !== 8) {
    return undefined;
  }

  return hextets.every((part) => {
    const value = Number.parseInt(part || '0', 16);
    return /^[0-9a-f]{0,4}$/.test(part) && value >= 0 && value <= 0xffff;
  })
    ? hextets
    : undefined;
}

function getIPv4FromMappedIPv6(ip: string): string | undefined {
  const hextets = normalizeIpv6Hextets(ip);
  if (!hextets) {
    return undefined;
  }

  const values = hextets.map((part) => Number.parseInt(part || '0', 16));
  const isMapped =
    values.slice(0, 5).every((value) => value === 0) && values[5] === 0xffff;

  if (!isMapped) {
    return undefined;
  }

  return `${values[6] >> 8}.${values[6] & 255}.${values[7] >> 8}.${
    values[7] & 255
  }`;
}

export function isBlockedIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    return isBlockedIPv4(ip);
  }
  if (version === 6) {
    // IPv4-mapped IPv6 can arrive in dotted form (`::ffff:127.0.0.1`) or
    // canonical hex form (`::ffff:7f00:1`) after URL parsing / DNS lookup.
    const mapped = getIPv4FromMappedIPv6(ip);
    if (mapped) {
      return isBlockedIPv4(mapped);
    }
    return isBlockedIPv6(ip);
  }
  return true;
}

export async function isSafePublicHttpsUrl(value: unknown): Promise<boolean> {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') {
    return false;
  }

  if (!parsed.hostname) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (hostname === 'localhost') {
    return false;
  }

  // If user supplied a literal IP directly, validate it immediately
  const literalIpVersion = net.isIP(hostname);
  if (literalIpVersion) {
    return !isBlockedIp(hostname);
  }

  try {
    const records = await dns.lookup(hostname, { all: true });

    if (!records.length) {
      return false;
    }

    for (const record of records) {
      if (isBlockedIp(record.address)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

@ValidatorConstraint({ name: 'IsSafeWebhookUrl', async: true })
export class IsSafeWebhookUrlConstraint
  implements ValidatorConstraintInterface
{
  async validate(value: unknown, _args: ValidationArguments): Promise<boolean> {
    return isSafePublicHttpsUrl(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'URL must be a public HTTPS URL and must not resolve to localhost, private, loopback, or link-local addresses';
  }
}

export function IsSafeWebhookUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsSafeWebhookUrlConstraint,
    });
  };
}
