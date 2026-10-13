export type WebhookHeader = { name: string; value: string };

export type WebhookChannel = {
  url: string;
  headers: WebhookHeader[];
};

const BLOCKED_HEADER_NAMES = new Set([
  'content-type',
  'content-length',
  'host',
  'connection',
  'transfer-encoding',
  'upgrade',
]);

const HEADER_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

const MAX_HEADERS = 30;
const MAX_HEADER_VALUE = 4096;

export function normalizeWebhookHeaders(
  rows: unknown
): { headers: WebhookHeader[] } | { error: string } {
  if (rows == null) {
    return { headers: [] };
  }

  if (!Array.isArray(rows)) {
    return { error: 'Headers could not be read.' };
  }

  if (rows.length > MAX_HEADERS) {
    return { error: 'Too many headers.' };
  }

  const headers: WebhookHeader[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (!row || typeof row !== 'object') {
      return { error: 'Headers could not be read.' };
    }

    const rawName = 'name' in row ? row.name : '';
    const rawValue = 'value' in row ? row.value : '';
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    const value = typeof rawValue === 'string' ? rawValue : '';

    if (!name && !value.trim()) {
      continue;
    }

    if (!name) {
      return { error: 'A header needs a name.' };
    }

    if (!HEADER_NAME.test(name)) {
      return { error: 'A header name is not valid.' };
    }

    const key = name.toLowerCase();
    if (BLOCKED_HEADER_NAMES.has(key)) {
      return { error: `${name} cannot be set.` };
    }

    if (seen.has(key)) {
      return { error: 'Each header name can only be used once.' };
    }

    if (value.length > MAX_HEADER_VALUE || /[\r\n\0]/.test(value)) {
      return { error: 'A header value is not valid.' };
    }

    seen.add(key);
    headers.push({ name, value });
  }

  return { headers };
}

export function readWebhookUrl(
  value: unknown
): { url: string } | { error: string } {
  if (typeof value !== 'string' || !value.trim()) {
    return { error: 'The URL is missing.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return { error: 'The URL is not valid.' };
  }

  if (parsed.protocol !== 'https:') {
    return { error: 'The URL must start with https://.' };
  }

  if (parsed.username || parsed.password) {
    return { error: 'The URL cannot contain a username or password.' };
  }

  if (!parsed.hostname) {
    return { error: 'The URL is not valid.' };
  }

  return { url: parsed.toString() };
}

export function readWebhookChannel(
  input: unknown
): WebhookChannel | { error: string } {
  if (!input || typeof input !== 'object') {
    return { error: 'The connection details could not be read.' };
  }

  const url = readWebhookUrl('url' in input ? input.url : undefined);
  if ('error' in url) {
    return url;
  }

  const headers = normalizeWebhookHeaders(
    'headers' in input ? input.headers : undefined
  );
  if ('error' in headers) {
    return headers;
  }

  return { url: url.url, headers: headers.headers };
}
