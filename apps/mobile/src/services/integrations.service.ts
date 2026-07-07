import * as Linking from 'expo-linking';

import type {
  AvailableIntegrationProvider,
  IntegrationCustomField,
  IntegrationProviderPage,
} from '@/src/api/integrations.api';
import { frontendAssetUrl, runtimeConfig } from '@/src/config/runtime';

type GlobalEncoding = typeof globalThis & {
  Buffer?: {
    from(input: string, encoding: 'utf8'): { toString(format: 'base64'): string };
  };
  btoa?: (input: string) => string;
};

const pageFunctionByProvider: Record<string, 'companies' | 'pages'> = {
  'linkedin-page': 'companies',
  facebook: 'pages',
  gmb: 'pages',
  instagram: 'pages',
  tumblr: 'pages',
  youtube: 'pages',
};

export function getIntegrationCallbackUrl() {
  return runtimeConfig.mobileIntegrationCallback;
}

export function getProviderPageFunction(provider: string) {
  return pageFunctionByProvider[provider];
}

export function getProviderDisplayName(provider?: Pick<AvailableIntegrationProvider, 'identifier' | 'name'>) {
  if (!provider) {
    return 'Channel';
  }

  return provider.name || provider.identifier;
}

export function getPlatformIconUrl(identifier?: string | null) {
  if (!identifier) {
    return undefined;
  }

  return frontendAssetUrl(`/icons/platforms/${identifier}.png`);
}

export function encodeIntegrationCredentials(values: Record<string, string>) {
  const value = JSON.stringify(values);
  const globalEncoding = globalThis as GlobalEncoding;

  if (globalEncoding.Buffer) {
    return globalEncoding.Buffer.from(value, 'utf8').toString('base64');
  }

  if (globalEncoding.btoa) {
    const binary = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    );

    return globalEncoding.btoa(binary);
  }

  return encodeUtf8Base64(value);
}

function encodeUtf8Base64(value: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const bytes = encodeUtf8(value);
  let output = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const joined = (first << 16) | (second << 8) | third;

    output += alphabet[(joined >> 18) & 63];
    output += alphabet[(joined >> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(joined >> 6) & 63] : '=';
    output += index + 2 < bytes.length ? alphabet[joined & 63] : '=';
  }

  return output;
}

function encodeUtf8(value: string) {
  const bytes: number[] = [];

  for (let index = 0; index < value.length; index += 1) {
    let codePoint = value.charCodeAt(index);

    if (codePoint >= 0xd800 && codePoint <= 0xdbff && index + 1 < value.length) {
      const next = value.charCodeAt(index + 1);

      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (next - 0xdc00);
        index += 1;
      }
    }

    if (codePoint < 0x80) {
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint < 0x10000) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    }
  }

  return bytes;
}

export function getTimezoneOffset() {
  return String(-new Date().getTimezoneOffset());
}

export function getFieldValidationError(field: IntegrationCustomField, value: string) {
  if (!value.trim()) {
    return `${field.label} is required.`;
  }

  try {
    const parsed = parseValidationRegex(field.validation);

    if (parsed && !parsed.test(value)) {
      return `${field.label} is invalid.`;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function parseValidationRegex(value: string) {
  if (!value.startsWith('/')) {
    return undefined;
  }

  const lastSlash = value.lastIndexOf('/');

  if (lastSlash <= 0) {
    return undefined;
  }

  return new RegExp(value.slice(1, lastSlash), value.slice(lastSlash + 1));
}

export function getPageSelectionPayload(provider: string, page: IntegrationProviderPage) {
  if (provider === 'facebook' || provider === 'linkedin-page') {
    return { page: String(page.id ?? '') };
  }

  if (provider === 'instagram') {
    return { id: String(page.id ?? ''), pageId: String(page.pageId ?? '') };
  }

  if (provider === 'gmb') {
    return {
      accountName: String(page.accountName ?? ''),
      id: String(page.id ?? ''),
      locationName: String(page.locationName ?? ''),
    };
  }

  return { id: String(page.id ?? '') };
}

export function getPageImage(page: IntegrationProviderPage) {
  if (typeof page.picture === 'string') {
    return page.picture;
  }

  return page.picture?.data?.url;
}

export function getPageSubtitle(page: IntegrationProviderPage) {
  return page.username || page.accountName || page.locationName || page.pageId || page.id || '';
}

export function getIntegrationReturnParams(url: string) {
  const parsed = Linking.parse(url);
  const params: Record<string, string> = {};

  Object.entries(parsed.queryParams ?? {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      params[key] = value[0] ?? '';
      return;
    }

    if (value !== undefined) {
      params[key] = String(value);
    }
  });

  return params;
}
