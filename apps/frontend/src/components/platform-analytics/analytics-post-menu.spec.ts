import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const menu = readFileSync(
  fileURLToPath(new URL('./analytics-post-menu.tsx', import.meta.url)),
  'utf8',
);
const table = readFileSync(
  fileURLToPath(new URL('./workspace.analytics.tsx', import.meta.url)),
  'utf8',
);

describe('analytics post actions', () => {
  it('reuses calendar preview, duplicate and delete', () => {
    assert.match(menu, /usePostActions/);
    assert.match(menu, /preview_post/);
    assert.match(menu, /duplicate_post/);
    assert.match(menu, /delete_post/);
    assert.match(menu, /editPost\(loadPost, true\)/);
    assert.match(menu, /deletePost\(loadPost\)/);
  });

  it('opens the in-app preview, the live post, and the media lightbox', () => {
    assert.match(menu, /\/p\/\$\{post\.id\}\?share=true/);
    assert.match(menu, /go_to_post/);
    assert.match(menu, /releaseURL/);
    assert.match(menu, /enlarge_image/);
    assert.match(menu, /MediaLightbox/);
  });

  it('uses a sheet on touch and an anchored menu on desktop', () => {
    assert.match(menu, /MobileSheet/);
    assert.match(menu, /useAnchoredPopover/);
    assert.match(menu, /min-h-\[44px\]/);
  });

  it('is wired into Top 5, the desktop table, and the phone list', () => {
    assert.equal((table.match(/<AnalyticsPostMenu /g) || []).length, 3);
  });
});
