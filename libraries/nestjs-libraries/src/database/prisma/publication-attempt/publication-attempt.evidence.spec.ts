import { describe, expect, it } from 'vitest';
import {
  buildAttemptEvidence,
  canonicalJson,
  canonicalSha256,
  normalizeProviderResult,
  signEvidenceHash,
} from './publication-attempt.evidence';

describe('publication attempt evidence', () => {
  it('canonicalizes object keys while preserving array order', () => {
    expect(canonicalJson({ z: 1, a: { y: 2, x: 3 } })).toBe(
      canonicalJson({ a: { x: 3, y: 2 }, z: 1 })
    );
    expect(canonicalSha256({ items: ['a', 'b'] })).not.toBe(
      canonicalSha256({ items: ['b', 'a'] })
    );
  });

  it('signs the canonical evidence hash without exposing the key', () => {
    const key = '0123456789abcdef0123456789abcdef';
    const signature = signEvidenceHash(canonicalSha256({ id: 'attempt' }), key);
    expect(signature).toMatch(/^hmac-sha256:[a-f0-9]{64}$/);
    expect(signature).not.toContain(key);
  });

  it('retains content and ids but redacts credentials and every media location', () => {
    const evidence = buildAttemptEvidence(
      {
        id: 'integration-1',
        internalId: 'provider-account-1',
        organizationId: 'org-1',
        customerId: 'customer-1',
        providerIdentifier: 'example',
      },
      [
        {
          id: 'post-1',
          message: 'approved caption',
          settings: {
            title: 'public title',
            accessToken: 'never-store-me',
            headers: { Authorization: 'Bearer also-never-store-me' },
            callback:
              'https://example.test/callback?signature=signed-secret-value',
            authenticatedUrl: 'https://user:password@example.test/private',
          },
          media: [
            {
              id: 'media-1',
              type: 'image',
              alt: 'approved alt text',
              path: 'https://private.test/image?token=media-secret',
              url: '/private/files/image.png',
              thumbnail: 'https://private.test/thumb',
            },
          ],
        },
      ]
    );
    const serialized = JSON.stringify(evidence);

    expect(serialized).toContain('approved caption');
    expect(serialized).toContain('provider-account-1');
    expect(serialized).toContain('media-1');
    expect(serialized).toContain('approved alt text');
    expect(serialized).toContain('public title');
    expect(serialized).not.toContain('never-store-me');
    expect(serialized).not.toContain('also-never-store-me');
    expect(serialized).not.toContain('signed-secret-value');
    expect(serialized).not.toContain('user:password');
    expect(serialized).not.toContain('private.test');
    expect(serialized).not.toContain('/private/files');
  });

  it('binds exact outgoing media paths only through the payload hash', () => {
    const integration = {
      id: 'integration-1',
      internalId: 'provider-account-1',
      organizationId: 'org-1',
      providerIdentifier: 'example',
    };
    const first = buildAttemptEvidence(integration, [
      {
        id: 'post-1',
        message: 'caption',
        settings: {},
        media: [{ id: 'media-1', path: '/first/private/path' }],
      },
    ]);
    const second = buildAttemptEvidence(integration, [
      {
        id: 'post-1',
        message: 'caption',
        settings: {},
        media: [{ id: 'media-1', path: '/second/private/path' }],
      },
    ]);

    expect(first.outgoingPayloadHash).not.toBe(second.outgoingPayloadHash);
    expect(JSON.stringify(first.mediaEvidence)).not.toContain(
      '/first/private/path'
    );
  });

  it('normalizes results without retaining opaque provider response data', () => {
    const normalized = normalizeProviderResult([
      {
        id: 'post-1',
        status: 'pending',
        postId: 'platform-1',
        releaseURL: 'https://platform.test/post/1',
        pendingData: { accessToken: 'raw-provider-secret' },
      },
    ]);

    expect(normalized).toEqual([
      {
        postId: 'post-1',
        status: 'provider-accepted',
        platformReleaseId: 'platform-1',
        platformReleaseUrl: 'https://platform.test/post/1',
      },
    ]);
    expect(JSON.stringify(normalized)).not.toContain('raw-provider-secret');

    const unsafeRelease = normalizeProviderResult([
      {
        id: 'post-2',
        status: 'completed',
        postId: 'platform-2',
        releaseURL:
          'https://platform.test/post/2?access_token=release-url-secret',
      },
    ]);
    expect(unsafeRelease[0].platformReleaseUrl).toBeNull();
    expect(JSON.stringify(unsafeRelease)).not.toContain('release-url-secret');
  });
});
