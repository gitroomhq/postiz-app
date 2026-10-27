/** Private storage is opt-in; public R2/local installations keep their behavior. */
export const privateMediaEnabled = () =>
  process.env.STORAGE_PROVIDER === 'cloudflare' &&
  process.env.STORAGE_PRIVATE === 'true';

/** Accept only this installation's bucket, never arbitrary URLs or keys. */
export function privateMediaKey(value: string): string | undefined {
  if (!privateMediaEnabled()) return;
  try {
    const url = new URL(value);
    const bases = [new URL(process.env.CLOUDFLARE_BUCKET_URL!)];
    // R2's signed download host can differ from the configured public/CDN URL.
    if (process.env.CLOUDFLARE_BUCKETNAME) {
      const endpoint =
        process.env.CLOUDFLARE_ENDPOINT ||
        `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      bases.push(
        new URL(
          endpoint.replace(/\/$/, '') + '/' + process.env.CLOUDFLARE_BUCKETNAME,
        ),
      );
      const virtualHost = new URL(endpoint);
      virtualHost.hostname =
        process.env.CLOUDFLARE_BUCKETNAME + '.' + virtualHost.hostname;
      bases.push(virtualHost);
    }
    const base = bases.find(
      (base) =>
        url.origin === base.origin &&
        url.pathname.startsWith(base.pathname.replace(/\/$/, '') + '/'),
    );
    if (!base) return;
    const prefix = base.pathname.replace(/\/$/, '') + '/';
    const key = decodeURIComponent(url.pathname.slice(prefix.length));
    // Postiz generates flat filenames. Do not sign paths, encoded separators,
    // or user-supplied traversal sequences.
    if (!/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(key)) return;
    return key;
  } catch {
    return;
  }
}

export function canonicalMediaUrl(key: string): string {
  return process.env.CLOUDFLARE_BUCKET_URL!.replace(/\/$/, '') + '/' + key;
}

/** Includes JSON-encoded post attachments, but preserves dates and buffers. */
export async function mapMediaUrls<T>(
  value: T,
  replace: (url: string, key: string) => Promise<string>,
): Promise<T> {
  if (typeof value === 'string') {
    const key = privateMediaKey(value);
    if (key) return (await replace(value, key)) as T;
    if (value.startsWith('[') || value.startsWith('{')) {
      let parsed;
      try {
        parsed = JSON.parse(value);
      } catch {
        return value;
      }
      return JSON.stringify(await mapMediaUrls(parsed, replace)) as T;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => mapMediaUrls(item, replace))) as T;
  }
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      await Promise.all(
        Object.entries(value).map(async ([key, item]) => [
          key,
          await mapMediaUrls(item, replace),
        ]),
      ),
    ) as T;
  }
  return value;
}
