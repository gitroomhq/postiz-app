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

const blockedIPv4Ranges: [string, number][] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['100.64.0.0', 10],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3], // multicast/reserved
];

// BlockList matches an IPv4 rule against the address in any notation,
// including IPv4-mapped IPv6 like ::ffff:7f00:1 (what the URL parser turns
// [::ffff:127.0.0.1] into), so the addresses are never compared as strings.
const blockedIps = new net.BlockList();

for (const [address, prefix] of blockedIPv4Ranges) {
  blockedIps.addSubnet(address, prefix, 'ipv4');

  // the same IPv4 range embedded in NAT64 (64:ff9b::/96) and 6to4 (2002::/16)
  const [a, b, c, d] = address.split('.').map(Number);
  const high = ((a << 8) | b).toString(16);
  const low = ((c << 8) | d).toString(16);
  blockedIps.addSubnet(`64:ff9b::${high}:${low}`, 96 + prefix, 'ipv6');
  blockedIps.addSubnet(`2002:${high}:${low}::`, 16 + prefix, 'ipv6');
}

blockedIps.addSubnet('::', 96, 'ipv6'); // unspecified, loopback, IPv4-compatible
blockedIps.addSubnet('fe80::', 10, 'ipv6'); // link-local
blockedIps.addSubnet('fec0::', 10, 'ipv6'); // site-local (deprecated)
blockedIps.addSubnet('fc00::', 7, 'ipv6'); // unique local
blockedIps.addSubnet('ff00::', 8, 'ipv6'); // multicast

export function isBlockedIPv4(ip: string): boolean {
  return net.isIPv4(ip) ? blockedIps.check(ip, 'ipv4') : true;
}

export function isBlockedIPv6(ip: string): boolean {
  return net.isIPv6(ip) ? blockedIps.check(ip, 'ipv6') : true;
}

export function isBlockedIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    return isBlockedIPv4(ip);
  }
  if (version === 6) {
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
export class IsSafeWebhookUrlConstraint implements ValidatorConstraintInterface {
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