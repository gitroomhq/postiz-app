import { ssrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
import { isSafePublicHttpsUrl } from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';

export function normalizeInstanceUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Enter a valid Pixelfed or Fediverse instance URL.');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Instance URLs must use HTTPS.');
  }
  if (url.username || url.password) {
    throw new Error('Instance URLs cannot contain credentials.');
  }
  if ((url.pathname && url.pathname !== '/') || url.search || url.hash) {
    throw new Error('Enter the instance origin only, without a path or query.');
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('Private instance addresses are not allowed.');
  }

  return url.origin;
}

export async function assertSafeInstanceUrl(input: string): Promise<string> {
  const origin = normalizeInstanceUrl(input);
  if (!(await isSafePublicHttpsUrl(origin))) {
    throw new Error('Private instance addresses are not allowed.');
  }
  return origin;
}

export async function withSafeInstanceDispatcher<T>(
  input: string,
  operation: (origin: string, dispatcher: unknown) => Promise<T>
): Promise<T> {
  return operation(await assertSafeInstanceUrl(input), ssrfSafeDispatcher);
}
