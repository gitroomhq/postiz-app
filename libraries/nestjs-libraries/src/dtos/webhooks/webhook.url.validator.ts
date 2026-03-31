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

@ValidatorConstraint({ name: 'IsSafeWebhookUrl', async: true })
export class IsSafeWebhookUrlConstraint implements ValidatorConstraintInterface {
  async validate(value: unknown, _args: ValidationArguments): Promise<boolean> {
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

    const hostname = parsed.hostname.toLowerCase();

    if (hostname === 'localhost') {
      return false;
    }

    // Optional: block explicit ports other than 443
    // if (parsed.port && parsed.port !== '443') {
    //   return false;
    // }

    // If user supplied a literal IP directly, validate it immediately
    const literalIpVersion = net.isIP(hostname);
    if (literalIpVersion) {
      return !this.isBlockedIp(hostname);
    }

    try {
      const records = await dns.lookup(hostname, { all: true });

      if (!records.length) {
        return false;
      }

      for (const record of records) {
        if (this.isBlockedIp(record.address)) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'URL must be a public HTTPS URL and must not resolve to localhost, private, loopback, or link-local addresses';
  }

  private isBlockedIp(ip: string): boolean {
    const version = net.isIP(ip);
    if (version === 4) {
      return this.isBlockedIPv4(ip);
    }
    if (version === 6) {
      return this.isBlockedIPv6(ip);
    }
    return true;
  }

  private isBlockedIPv4(ip: string): boolean {
    const [a, b] = ip.split('.').map(Number);

    if ([a, b].some((n) => Number.isNaN(n))) return true;

    return (
      a === 0 ||                       // 0.0.0.0/8
      a === 10 ||                      // 10.0.0.0/8
      a === 127 ||                     // 127.0.0.0/8
      (a === 169 && b === 254) ||      // 169.254.0.0/16
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
      (a === 192 && b === 168) ||      // 192.168.0.0/16
      (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10
      (a === 198 && (b === 18 || b === 19)) || // 198.18.0.0/15
      a >= 224                         // multicast/reserved
    );
  }

  private isBlockedIPv6(ip: string): boolean {
    const normalized = ip.toLowerCase();

    return (
      normalized === '::1' ||          // loopback
      normalized === '::' ||           // unspecified
      normalized.startsWith('fe80:') || // link-local
      normalized.startsWith('fc') ||   // unique local fc00::/7
      normalized.startsWith('fd') ||   // unique local fd00::/7
      normalized.startsWith('ff')      // multicast
    );
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