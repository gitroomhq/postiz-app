import { timer } from '@gitroom/helpers/utils/timer';
import { Integration } from '@prisma/client';
import { PendingCheckResponse } from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { ApplicationFailure } from '@temporalio/activity';
import { readOrFetch } from '@gitroom/helpers/utils/read.or.fetch';
import { getSsrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
import sharp from 'sharp';
import { createReadStream, statSync } from 'fs';
import { Readable } from 'stream';

export type ValidityMedia = {
  path: string;
  thumbnail?: string;
};

// Temporal serializes the whole ApplicationFailure (message + details) into the
// workflow history and ships it over gRPC, which has a hard frame limit (4MB by
// default). Provider error messages/bodies can be huge (full HTML error pages,
// base64 media echoed back, stack traces), so we cap every string that goes into
// the failure to keep the history small and avoid "GRPC Message too large".
const MAX_FAILURE_MESSAGE = 2_000;
const MAX_FAILURE_FIELD = 4_000;

export function truncateForTemporal(value: any, max: number): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = typeof value === 'string' ? value : safeStringify(value);
  if (str.length <= max) {
    return str;
  }

  return `${str.slice(0, max)}… [truncated ${str.length - max} chars]`;
}

export class RefreshToken extends ApplicationFailure {
  constructor(identifier: string, json: string, body: BodyInit, message = '') {
    super(
      truncateForTemporal(message, MAX_FAILURE_MESSAGE),
      'refresh_token',
      true,
      [
        {
          identifier,
          json: truncateForTemporal(json, MAX_FAILURE_FIELD),
          body: truncateForTemporal(body, MAX_FAILURE_FIELD),
        },
      ]
    );
  }
}

export class BadBody extends ApplicationFailure {
  constructor(identifier: string, json: string, body: BodyInit, message = '') {
    super(truncateForTemporal(message, MAX_FAILURE_MESSAGE), 'bad_body', true, [
      {
        identifier,
        json: truncateForTemporal(json, MAX_FAILURE_FIELD),
        body: truncateForTemporal(body, MAX_FAILURE_FIELD),
      },
    ]);
  }
}

export class NotEnoughScopes {
  constructor(
    public message = 'Not enough scopes, when choosing a provider, please add all the scopes'
  ) {}
}

function safeStringify(obj: any) {
  const seen = new WeakSet();

  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
}

export abstract class SocialAbstract {
  abstract identifier: string;
  maxConcurrentJob = 1;

  public handleErrors(
    body: string,
    status: number
  ):
    | { type: 'refresh-token' | 'bad-body' | 'retry'; value: string }
    | undefined {
    return undefined;
  }

  /**
   * Server-side replacement for the old client-side `checkValidity`.
   * Validates the media attached to a post (and its comments) against the
   * provider rules. Returns `true` when valid, or an error message string.
   *
   * `posts` mirrors the client shape: the outer array is the main post followed
   * by each comment, the inner array is the media items for that entry.
   *
   * Note: video-duration validations that used to run in the browser are not
   * re-implemented here (no ffmpeg dependency). Image-dimension checks use sharp.
   */
  async checkValidity(
    posts: Array<ValidityMedia[]>,
    settings: any,
    additionalSettings: any[]
  ): Promise<string | true> {
    return true;
  }

  /**
   * Providers that return a `pending` PostResponse from `post` / `comment` must
   * override this with a single, read-only status check (no loops, no timers) -
   * the polling loop lives in the post workflow, where a retry is harmless.
   *
   * The defaults throw so a provider that returns `pending` without overriding
   * fails loudly on the first test post instead of silently completing with a
   * bogus releaseURL. They are unreachable for providers that never return
   * `pending`.
   */
  public async checkPostStatus(
    accessToken: string,
    pendingData: any,
    integration: Integration
  ): Promise<PendingCheckResponse> {
    throw new BadBody(
      this.identifier,
      '{}',
      '{}',
      'checkPostStatus is not implemented for this provider'
    );
  }

  /** Runs the mutations left after `checkPostStatus` returns `ready`. Same contract as `checkPostStatus`. */
  public async finalizePost(
    accessToken: string,
    pendingData: any,
    integration: Integration
  ): Promise<PendingCheckResponse> {
    throw new BadBody(
      this.identifier,
      '{}',
      '{}',
      'finalizePost is not implemented for this provider'
    );
  }

  protected assetBoolean(value: boolean | string) {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value || false;
  }

  /** Reads the pixel dimensions of an image via sharp (works for http or local paths). */
  protected async getImageDimensions(
    path: string
  ): Promise<{ width: number; height: number }> {
    // Stored media paths are relative (e.g. "uploads/x.png"); resolve them to a
    // fetchable URL the same way posts.service.updateMedia does.
    const url =
      path?.indexOf('http') === -1
        ? `${process.env.FRONTEND_URL}/${path}`
        : path;
    const { width = 0, height = 0 } = await sharp(
      await readOrFetch(url)
    ).metadata();
    return { width, height };
  }

  // Resolves the total byte size of the media without loading it into memory:
  // a HEAD request for remote URLs, statSync for local files.
  protected async mediaSize(path: string, identifier = ''): Promise<number> {
    if (path.indexOf('http') === 0) {
      // the media path is user-influenced, keep the SSRF-safe dispatcher that
      // this.fetch applies to every other outbound request. identity encoding
      // so content-length matches the bytes a later GET actually streams
      // (fetch transparently decompresses encoded bodies).
      const head = await fetch(path, {
        method: 'HEAD',
        headers: { 'accept-encoding': 'identity' },
        dispatcher: getSsrfSafeDispatcher(),
      } as any);
      const length = Number(head.headers.get('content-length'));
      // A failed HEAD can still carry a content-length (of the error body),
      // and a zero/NaN size would poison chunk-count math downstream.
      if (!head.ok || !Number.isFinite(length) || length <= 0) {
        throw new BadBody(
          identifier,
          '{}',
          Buffer.from('{}'),
          'Could not determine the media size for upload'
        );
      }
      return length;
    }

    return statSync(path).size;
  }

  // Reads a single [start, end] byte range into memory. Used by providers whose
  // chunked-upload APIs require a Buffer per segment: only one small chunk is
  // resident at a time, never the whole file.
  protected async mediaChunk(
    path: string,
    start: number,
    end: number,
    identifier = ''
  ): Promise<Buffer> {
    if (path.indexOf('http') === 0) {
      const response = await fetch(path, {
        headers: {
          Range: `bytes=${start}-${end}`,
          'accept-encoding': 'identity',
        },
        dispatcher: getSsrfSafeDispatcher(),
      } as any);
      // Anything but 206 means the server ignored the Range header: buffering
      // response.body here would silently load the whole file into memory and
      // upload corrupted chunks.
      if (response.status !== 206) {
        throw new BadBody(
          identifier,
          '{}',
          Buffer.from('{}'),
          `Media server did not honor the range request (status ${response.status})`
        );
      }
      return Buffer.from(await response.arrayBuffer());
    }

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      createReadStream(path, { start, end })
        .on('data', (chunk) => chunks.push(chunk as Buffer))
        .on('end', () => resolve(Buffer.concat(chunks)))
        .on('error', reject);
    });
  }

  // Opens the media as a Node stream. The media path is user-influenced, so
  // remote URLs go through the same SSRF-safe dispatcher as every other
  // outbound request - never fetch these with plain axios/fetch.
  protected async mediaStream(
    path: string,
    identifier = ''
  ): Promise<Readable> {
    if (path.indexOf('http') !== 0) {
      return createReadStream(path);
    }

    // identity encoding so the streamed byte count matches the size mediaSize
    // reported - a decompressed body would overflow any declared length.
    const response = await fetch(path, {
      headers: { 'accept-encoding': 'identity' },
      dispatcher: getSsrfSafeDispatcher(),
    } as any);

    if (!response.ok || !response.body) {
      throw new BadBody(
        identifier,
        '{}',
        Buffer.from('{}'),
        'Could not read the media for upload'
      );
    }

    return Readable.fromWeb(response.body as any);
  }

  // Streamed request bodies can't be replayed by this.fetch's retry, so
  // providers wrap streamed uploads in a factory that rebuilds the request
  // (re-opening its source streams) on every attempt. Errors carrying a
  // `response` (axios errors, or a thrown { response: { status, data } })
  // go through the same retry and handleErrors classification rules as
  // this.fetch; anything else is rethrown untouched so Temporal keeps its
  // usual retry behavior.
  protected async runStreamedUpload<T>(
    func: () => Promise<T>,
    identifier = '',
    totalRetries = 0
  ): Promise<T> {
    try {
      return await func();
    } catch (err: any) {
      if (!err?.response) {
        throw err;
      }

      const status = err.response.status || 500;
      const data = err.response.data;
      // '|| {}' / "|| '{}'" match this.fetch, which never hands handleErrors
      // an empty string.
      const json =
        (typeof data === 'string' ? data : safeStringify(data || {})) || '{}';
      const handleError = this.handleErrors(json, status);

      if (
        totalRetries <= 2 &&
        (status === 429 ||
          (status === 500 && !handleError) ||
          handleError?.type === 'retry' ||
          json.includes('rate_limit_exceeded') ||
          json.includes('Rate limit'))
      ) {
        await timer(5000);
        return this.runStreamedUpload(func, identifier, totalRetries + 1);
      }

      if (
        (status === 401 &&
          (handleError?.type === 'refresh-token' || !handleError)) ||
        handleError?.type === 'refresh-token'
      ) {
        throw new RefreshToken(identifier, json, '{}', handleError?.value);
      }

      throw new BadBody(
        identifier,
        json,
        '{}',
        handleError?.value || 'Unknown Error'
      );
    }
  }

  public async mention(
    token: string,
    d: { query: string },
    id: string,
    integration: Integration
  ): Promise<
    | { id: string; label: string; image: string; doNotCache?: boolean }[]
    | { none: true }
  > {
    return { none: true };
  }

  async runInConcurrent<T>(
    func: (...args: any[]) => Promise<T>,
    ignoreConcurrency?: boolean
  ) {
    let globalErr = {};
    let value: any;
    try {
      value = await func();
    } catch (err) {
      const handle = this.handleErrors(safeStringify(err), 200);
      value = { err: true, value: 'Unknown Error', ...(handle || {}) };
      globalErr = err;
    }

    if (value && value?.err && value?.value) {
      if (value.type === 'refresh-token') {
        throw new RefreshToken(
          '',
          safeStringify({}),
          {} as any,
          value.value || ''
        );
      }
      throw new BadBody(
        '',
        safeStringify(globalErr),
        {} as any,
        value.value || ''
      );
    }

    return value;
  }

  async fetch(
    url: string,
    options: RequestInit = {},
    identifier = '',
    totalRetries = 0,
    ignoreConcurrency = false,
    message = ''
  ): Promise<Response> {
    const request = await fetch(url, {
      ...options,
      // @ts-ignore - undici-only option, not in the lib.dom RequestInit type
      dispatcher: (options as any).dispatcher ?? getSsrfSafeDispatcher(),
    });

    if (request.status === 200 || request.status === 201) {
      return request;
    }

    let json = '{}';
    try {
      json = await request.text();
    } catch (err) {
      json = '{}';
    }

    if (totalRetries > 2) {
      // Include the platform's actual response body so the failure is
      // diagnosable, instead of an empty '{}'.
      throw new BadBody(identifier, json, options.body || '{}', message);
    }

    const handleError = this.handleErrors(json || '{}', request.status);

    if (
      request.status === 429 ||
      (request.status === 500 && !handleError) ||
      json.includes('rate_limit_exceeded') ||
      json.includes('Rate limit')
    ) {
      await timer(5000);
      return this.fetch(
        url,
        options,
        identifier,
        totalRetries + 1,
        ignoreConcurrency,
        handleError?.value || 'Unknown Error'
      );
    }

    if (handleError?.type === 'retry') {
      await timer(5000);
      return this.fetch(
        url,
        options,
        identifier,
        totalRetries + 1,
        ignoreConcurrency,
        handleError?.value || 'Unknown Error'
      );
    }

    if (
      (request.status === 401 &&
        (handleError?.type === 'refresh-token' || !handleError)) ||
      handleError?.type === 'refresh-token'
    ) {
      throw new RefreshToken(
        identifier,
        json,
        options.body!,
        handleError?.value
      );
    }

    throw new BadBody(
      identifier,
      json,
      options.body!,
      handleError?.value || 'Unknown Error'
    );
  }

  checkScopes(required: string[], got: string | string[]) {
    if (Array.isArray(got)) {
      if (!required.every((scope) => got.includes(scope))) {
        throw new NotEnoughScopes();
      }

      return true;
    }

    const newGot = decodeURIComponent(got);

    const splitType = newGot.indexOf(',') > -1 ? ',' : ' ';
    const gotArray = newGot.split(splitType);
    if (!required.every((scope) => gotArray.includes(scope))) {
      throw new NotEnoughScopes();
    }

    return true;
  }
}
