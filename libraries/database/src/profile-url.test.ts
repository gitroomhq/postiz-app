/**
 * Unit tests for profile URL validators.
 * Run with: pnpm exec tsx --test libraries/database/src/profile-url.test.ts
 * (or: node --import tsx --test libraries/database/src/profile-url.test.ts)
 *
 * Using node:test so the libraries/* layer has zero jest/vitest plumbing.
 * Frontend tests (apps/frontend/) stay on whatever next.js test runner ships.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { detectPlatform, validateProfileUrl } from './profile-url';

describe('detectPlatform', () => {
  it('detects instagram', () => {
    assert.equal(detectPlatform('https://www.instagram.com/john'), 'instagram');
    assert.equal(detectPlatform('https://instagram.com/jane/'), 'instagram');
  });
  it('detects tiktok', () => {
    assert.equal(detectPlatform('https://www.tiktok.com/@user'), 'tiktok');
  });
  it('detects facebook', () => {
    assert.equal(detectPlatform('https://facebook.com/page'), 'facebook');
    assert.equal(detectPlatform('https://www.fb.com/page'), 'facebook');
  });
  it('detects rednote (xiaohongshu)', () => {
    assert.equal(
      detectPlatform('https://www.xiaohongshu.com/user/profile/abc123'),
      'rednote',
    );
  });
  it('detects douyin', () => {
    assert.equal(
      detectPlatform('https://www.douyin.com/user/MS4wLjA'),
      'douyin',
    );
  });
  it('returns null for unknown host', () => {
    assert.equal(detectPlatform('https://twitter.com/user'), null);
    assert.equal(detectPlatform('not a url'), null);
    assert.equal(detectPlatform(''), null);
  });
});

describe('validateProfileUrl — instagram', () => {
  it('accepts profile root with @', () => {
    const r = validateProfileUrl('instagram', 'https://www.instagram.com/@john_ig');
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.handle, 'john_ig');
      assert.equal(r.normalizedUrl, 'https://www.instagram.com/@john_ig');
    }
  });
  it('accepts profile root without @', () => {
    const r = validateProfileUrl('instagram', 'https://instagram.com/jane.smith/');
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.handle, 'jane.smith');
  });
  it('rejects post URL', () => {
    const r = validateProfileUrl('instagram', 'https://www.instagram.com/p/ABC123/');
    assert.equal(r.ok, false);
  });
  it('rejects reel URL', () => {
    const r = validateProfileUrl('instagram', 'https://www.instagram.com/reel/XYZ/');
    assert.equal(r.ok, false);
  });
  it('rejects cross-platform paste (tiktok URL claimed as instagram)', () => {
    const r = validateProfileUrl('instagram', 'https://www.tiktok.com/@user');
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /does not match platform instagram/);
  });
});

describe('validateProfileUrl — tiktok', () => {
  it('accepts @handle', () => {
    const r = validateProfileUrl('tiktok', 'https://www.tiktok.com/@dancer');
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.handle, 'dancer');
  });
  it('rejects video URL', () => {
    const r = validateProfileUrl(
      'tiktok',
      'https://www.tiktok.com/@dancer/video/12345',
    );
    assert.equal(r.ok, false);
  });
});

describe('validateProfileUrl — facebook', () => {
  it('accepts vanity handle', () => {
    const r = validateProfileUrl('facebook', 'https://www.facebook.com/zuck');
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.handle, 'zuck');
  });
  it('accepts profile.php?id=', () => {
    const r = validateProfileUrl(
      'facebook',
      'https://www.facebook.com/profile.php?id=100012345',
    );
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.handle, '100012345');
      assert.equal(
        r.normalizedUrl,
        'https://www.facebook.com/profile.php?id=100012345',
      );
    }
  });
  it('rejects profile.php with non-numeric id', () => {
    const r = validateProfileUrl(
      'facebook',
      'https://www.facebook.com/profile.php?id=abc',
    );
    assert.equal(r.ok, false);
  });
  it('rejects /share path', () => {
    const r = validateProfileUrl('facebook', 'https://www.facebook.com/share/p/abc');
    assert.equal(r.ok, false);
  });
});

describe('validateProfileUrl — rednote', () => {
  it('accepts /user/profile/<id>', () => {
    const r = validateProfileUrl(
      'rednote',
      'https://www.xiaohongshu.com/user/profile/5f8a2b3c4d5e6f7g8h9i0',
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.handle, '5f8a2b3c4d5e6f7g8h9i0');
  });
  it('rejects post URL', () => {
    const r = validateProfileUrl(
      'rednote',
      'https://www.xiaohongshu.com/explore/abc',
    );
    assert.equal(r.ok, false);
  });
});

describe('validateProfileUrl — douyin', () => {
  it('accepts /user/<sec_uid>', () => {
    const r = validateProfileUrl(
      'douyin',
      'https://www.douyin.com/user/MS4wLjABAAAA_long-id-with-dashes',
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.handle, 'MS4wLjABAAAA_long-id-with-dashes');
  });
});

describe('validateProfileUrl — edge cases', () => {
  it('rejects empty string', () => {
    const r = validateProfileUrl('instagram', '');
    assert.equal(r.ok, false);
  });
  it('rejects whitespace-only', () => {
    const r = validateProfileUrl('instagram', '   ');
    assert.equal(r.ok, false);
  });
  it('rejects malformed URL', () => {
    const r = validateProfileUrl('instagram', 'not-a-url');
    assert.equal(r.ok, false);
  });
  it('rejects non-http protocol', () => {
    const r = validateProfileUrl('instagram', 'ftp://instagram.com/user');
    assert.equal(r.ok, false);
  });
  it('strips trailing slash in normalizedUrl', () => {
    const r = validateProfileUrl('instagram', 'https://www.instagram.com/user/');
    if (r.ok) assert.ok(!r.normalizedUrl.endsWith('/'));
  });
});
