import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const calendar = readFileSync(
  fileURLToPath(new URL('./calendar.tsx', import.meta.url)),
  'utf8',
);
const manage = readFileSync(
  fileURLToPath(
    new URL('../new-launch/manage.modal.tsx', import.meta.url)
  ),
  'utf8',
);
const posts = readFileSync(
  fileURLToPath(new URL('./posts.panel.tsx', import.meta.url)),
  'utf8',
);

describe('phone calendar and composer', () => {
  it('renders week as a day-chip agenda instead of a 7-column grid', () => {
    assert.match(calendar, /const MobileWeekAgenda/);
    assert.match(calendar, /mobile \? \(\s*<MobileWeekAgenda/);
    assert.match(calendar, /data-tour="cal-grid"/);
  });

  it('renders month as a compact date picker on phone', () => {
    assert.match(calendar, /const MobileMonthAgenda/);
    assert.match(calendar, /grid-cols-7/);
  });

  it('disables HTML5 drag on phone widths', () => {
    assert.match(calendar, /window\.innerWidth >= 760/);
  });

  it('hides the collapsed 44px posts rail on phone', () => {
    assert.match(posts, /if \(mobile\) return null;/);
  });

  it('splits composer into Edit and Preview panes on phone', () => {
    assert.match(manage, /composerPane/);
    assert.match(manage, /setComposerPane\('preview'\)/);
    assert.doesNotMatch(manage, /max-h-\[340px\]/);
  });

  it('opens Day/Week/Month from a single View sheet on phone', () => {
    const filters = readFileSync(
      fileURLToPath(new URL('./filters.tsx', import.meta.url)),
      'utf8',
    );
    assert.match(filters, /data-cal-view-sheet/);
    assert.match(filters, /viewSheetOpen/);
  });

  it('hides the Posts rail toggle and calendar/list segment on phone', () => {
    const filters = readFileSync(
      fileURLToPath(new URL('./filters.tsx', import.meta.url)),
      'utf8',
    );
    assert.doesNotMatch(filters, /data-posts-toggle/);
    assert.match(filters, /\{!mobile && \(/);
  });
});

const addProvider = readFileSync(
  fileURLToPath(new URL('./add.provider.component.tsx', import.meta.url)),
  'utf8',
);
const newPost = readFileSync(
  fileURLToPath(new URL('./new.post.tsx', import.meta.url)),
  'utf8',
);

describe('phone chrome and channel picker', () => {
  it('uses the viewport to drive the Add Channel list even when isMobile is unset', () => {
    assert.match(addProvider, /const phone = Boolean\(isMobile\) \|\| mobile/);
    assert.match(addProvider, /phone && 'flex flex-col gap-\[8px\]'/);
  });

  it('renders Create Post as a 44px plus on phone', () => {
    assert.match(newPost, /mobile \? 'size-\[44px\]' : 'h-\[36px\]'/);
    assert.match(newPost, /\{\!mobile && \(/);
  });
});
