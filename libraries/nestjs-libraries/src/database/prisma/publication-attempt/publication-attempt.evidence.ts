import { createHash, createHmac } from 'crypto';

const SENSITIVE_KEY =
  /(authorization|cookie|credential|password|secret|token|private.?key|api.?key|headers?|signature)/i;
const SENSITIVE_URL_PARAMETER =
  /[?&](access_token|api_key|key|password|secret|signature|sig|token|x-amz-[^=]+)=/i;
const BEARER_TOKEN = /^bearer\s+/i;
const URL_WITH_CREDENTIALS = /^https?:\/\/[^/?#\s]*@/i;

function canonicalValue(value: unknown): unknown {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Canonical JSON does not support non-finite numbers');
    }
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      item === undefined ? null : canonicalValue(item)
    );
  }

  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((output, key) => {
        const item = (value as Record<string, unknown>)[key];
        if (
          item !== undefined &&
          typeof item !== 'function' &&
          typeof item !== 'symbol'
        ) {
          output[key] = canonicalValue(item);
        }
        return output;
      }, {});
  }

  throw new TypeError(`Canonical JSON does not support ${typeof value}`);
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

export function canonicalSha256(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function signEvidenceHash(hash: string, signingKey: string): string {
  if (!signingKey || Buffer.byteLength(signingKey) < 32) {
    throw new Error(
      'POSTIZ_PUBLICATION_EVIDENCE_HMAC_KEY must contain at least 32 bytes'
    );
  }

  return `hmac-sha256:${createHmac('sha256', signingKey)
    .update(hash)
    .digest('hex')}`;
}

function redacted(value: unknown) {
  return {
    redacted: true,
    sha256: canonicalSha256(value),
  };
}

function sensitiveString(value: string): boolean {
  return (
    BEARER_TOKEN.test(value) ||
    SENSITIVE_URL_PARAMETER.test(value) ||
    URL_WITH_CREDENTIALS.test(value)
  );
}

export function redactSettingsEvidence(value: unknown, key = ''): unknown {
  if (SENSITIVE_KEY.test(key)) {
    return redacted(value);
  }

  if (typeof value === 'string') {
    return sensitiveString(value) ? redacted(value) : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSettingsEvidence(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).reduce<
      Record<string, unknown>
    >((output, childKey) => {
      output[childKey] = redactSettingsEvidence(
        (value as Record<string, unknown>)[childKey],
        childKey
      );
      return output;
    }, {});
  }

  return value;
}

function mediaIdentifier(media: Record<string, unknown>) {
  return (
    media.id || media.mediaId || media.providerId || media.assetId || undefined
  );
}

export function redactMediaEvidence(media: unknown): unknown[] {
  if (!Array.isArray(media)) {
    return [];
  }

  return media.map((item) => {
    const value = (item || {}) as Record<string, unknown>;
    return {
      ...(mediaIdentifier(value)
        ? { mediaId: String(mediaIdentifier(value)) }
        : {}),
      ...(value.type ? { type: String(value.type) } : {}),
      ...(value.alt ? { alt: String(value.alt) } : {}),
      ...(value.path ? { pathHash: canonicalSha256(String(value.path)) } : {}),
      ...(value.url ? { urlHash: canonicalSha256(String(value.url)) } : {}),
      ...(value.thumbnail
        ? { thumbnailHash: canonicalSha256(String(value.thumbnail)) }
        : {}),
    };
  });
}

export type ProviderPostEvidence = {
  id: string;
  message: string;
  settings: unknown;
  media?: unknown[];
};

export function buildAttemptEvidence(
  integration: {
    id: string;
    internalId: string;
    organizationId: string;
    customerId?: string | null;
    providerIdentifier: string;
  },
  mappedPosts: ProviderPostEvidence[]
) {
  const captionEvidence = mappedPosts.map(({ id, message }) => ({
    postId: id,
    caption: message,
  }));
  const settingsEvidence = mappedPosts.map(({ id, settings }) => ({
    postId: id,
    settings: redactSettingsEvidence(settings),
  }));
  const mediaEvidence = mappedPosts.map(({ id, media }) => ({
    postId: id,
    media: redactMediaEvidence(media),
  }));
  const accountEvidence = {
    integrationId: integration.id,
    providerIdentifier: integration.providerIdentifier,
    providerAccountId: integration.internalId,
    customerId: integration.customerId || null,
  };

  return {
    captionEvidence,
    settingsEvidence,
    mediaEvidence,
    accountEvidence,
    // This hash binds the exact provider input, including media locations, while
    // the locations themselves never enter an evidence column.
    outgoingPayloadHash: canonicalSha256({
      account: {
        providerIdentifier: integration.providerIdentifier,
        providerAccountId: integration.internalId,
      },
      posts: mappedPosts,
    }),
  };
}

export type SafeProviderResult = {
  postId: string;
  status: 'provider-accepted' | 'provider-reported-success';
  platformReleaseId: string | null;
  platformReleaseUrl: string | null;
};

export function normalizeProviderResult(
  results: Array<{
    id?: unknown;
    status?: unknown;
    postId?: unknown;
    releaseURL?: unknown;
  }>
): SafeProviderResult[] {
  return results.map((result) => {
    const releaseUrl = result.releaseURL ? String(result.releaseURL) : '';
    return {
      postId: String(result.id || ''),
      status:
        String(result.status || '').toLowerCase() === 'pending'
          ? 'provider-accepted'
          : 'provider-reported-success',
      platformReleaseId: result.postId ? String(result.postId) : null,
      platformReleaseUrl:
        releaseUrl && !sensitiveString(releaseUrl) ? releaseUrl : null,
    };
  });
}

export function buildErrorEvidence(error: unknown, reason: string) {
  const value = error as {
    name?: unknown;
    type?: unknown;
    code?: unknown;
    message?: unknown;
  };
  const errorName = String(value?.name || 'Error');
  const errorType = String(value?.type || '');
  const errorCode = String(value?.code || '');
  return {
    reason,
    // Provider error metadata and messages can contain response bodies or
    // credentials. Bind them without copying any provider-controlled value.
    errorNameHash: canonicalSha256(errorName),
    errorTypeHash: errorType ? canonicalSha256(errorType) : null,
    errorCodeHash: errorCode ? canonicalSha256(errorCode) : null,
    errorMessageHash: canonicalSha256(String(value?.message || '')),
  };
}
