import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  AUTH_OG_DESCRIPTION,
  AUTH_OG_IMAGE,
  AUTH_OG_IMAGE_PATH,
  authShareMetadata,
} from './auth.open-graph.ts';

describe('authShareMetadata', () => {
  it('sets the tags Facebook Sharing Debugger asks for on /auth/login', () => {
    const share = authShareMetadata('/auth/login');
    assert.equal(share.openGraph?.title, 'PostQueen');
    assert.equal(share.openGraph?.description, AUTH_OG_DESCRIPTION);
    assert.equal(share.openGraph?.url, '/auth/login');
    assert.equal(share.openGraph?.type, 'website');
    assert.equal(share.openGraph?.siteName, 'PostQueen');
    assert.equal(share.twitter?.card, 'summary_large_image');
    assert.deepEqual(share.openGraph?.images, [AUTH_OG_IMAGE]);
    assert.equal(AUTH_OG_IMAGE.url, AUTH_OG_IMAGE_PATH);
    assert.equal(AUTH_OG_IMAGE.width, 1200);
    assert.equal(AUTH_OG_IMAGE.height, 630);
    assert.equal(AUTH_OG_IMAGE.type, 'image/png');
  });

  it('ships a 1200x630 PNG next to the other public logos', () => {
    const png = readFileSync(
      fileURLToPath(new URL('../../../public/og-image.png', import.meta.url))
    );
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
  });
});
