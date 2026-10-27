import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { MediaRepository } from '../database/prisma/media/media.repository';
import type { IUploadProvider } from './upload.interface';
import {
  privateMediaEnabled,
  privateMediaKey,
  canonicalMediaUrl,
  mapMediaUrls,
} from './private.media';

export class PrivateMediaAccess {
  constructor(
    private _mediaRepository: Pick<MediaRepository, 'findOwnedPath'>,
    private storage: Pick<IUploadProvider, 'signDownloadUrl'>,
  ) {}

  async response<T>(org: string, value: T, signed = false): Promise<T> {
    if (!privateMediaEnabled()) return value;
    const cache = new Map<string, Promise<string>>();
    return mapMediaUrls(value, async (_url, key) => {
      if (!cache.has(key))
        cache.set(
          key,
          (async () => {
            const canonical = canonicalMediaUrl(key);
            if (!(await this._mediaRepository.findOwnedPath(org, canonical)))
              return canonical;
            if (signed) return this.storage.signDownloadUrl!(key, 900);
            // Stable authenticated endpoint: the browser gets a fresh short-lived
            // S3 redirect each time it loads an image or video, even in old drafts.
            return (
              process.env.NEXT_PUBLIC_BACKEND_URL!.replace(/\/$/, '') +
              '/media/private/' +
              encodeURIComponent(key)
            );
          })(),
        );
      return cache.get(key)!;
    });
  }

  async download(org: string, key: string) {
    const canonical = canonicalMediaUrl(key);
    if (
      !privateMediaEnabled() ||
      privateMediaKey(canonical) !== key ||
      !(await this._mediaRepository.findOwnedPath(org, canonical))
    ) {
      throw new NotFoundException('Media not found');
    }
    return this.storage.signDownloadUrl!(key, 900);
  }

  async canonicalize<T>(org: string, value: T): Promise<T> {
    if (!privateMediaEnabled()) return value;
    const prefix =
      process.env.NEXT_PUBLIC_BACKEND_URL!.replace(/\/$/, '') +
      '/media/private/';
    // Convert only exact application media URLs, never arbitrary URL strings.
    const normalize = async (item: any): Promise<any> => {
      if (typeof item === 'string' && item.startsWith(prefix)) {
        const key = item.slice(prefix.length);
        const canonical = canonicalMediaUrl(key);
        if (
          privateMediaKey(canonical) !== key ||
          !(await this._mediaRepository.findOwnedPath(org, canonical))
        ) {
          throw new ForbiddenException(
            'Media does not belong to this organization',
          );
        }
        return canonical;
      }
      if (Array.isArray(item)) return Promise.all(item.map(normalize));
      if (item && Object.getPrototypeOf(item) === Object.prototype) {
        return Object.fromEntries(
          await Promise.all(
            Object.entries(item).map(async ([key, val]) => [
              key,
              await normalize(val),
            ]),
          ),
        );
      }
      if (
        typeof item === 'string' &&
        (item.startsWith('[') || item.startsWith('{'))
      ) {
        let parsed;
        try {
          parsed = JSON.parse(item);
        } catch {
          return item;
        }
        return JSON.stringify(await normalize(parsed));
      }
      return item;
    };
    const normalized = await normalize(value);
    return mapMediaUrls(normalized, async (_url, key) => {
      const canonical = canonicalMediaUrl(key);
      if (!(await this._mediaRepository.findOwnedPath(org, canonical))) {
        throw new ForbiddenException(
          'Media does not belong to this organization',
        );
      }
      return canonical;
    });
  }

  /** Called immediately before a provider fetches media, never at scheduling time. */
  async forPublishing<T>(org: string, value: T): Promise<T> {
    if (!privateMediaEnabled()) return value;
    return mapMediaUrls(value, async (_url, key) => {
      if (
        !(await this._mediaRepository.findOwnedPath(
          org,
          canonicalMediaUrl(key),
        ))
      ) {
        throw new ForbiddenException(
          'Media does not belong to this organization',
        );
      }
      return this.storage.signDownloadUrl!(key);
    });
  }
}
