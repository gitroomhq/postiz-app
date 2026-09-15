import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  dropPostGroupFromRows,
  dropPostGroupFromSwrData,
  isPostsSwrKey,
} from './posts-swr.ts';

const context = readFileSync(
  fileURLToPath(new URL('./calendar.context.tsx', import.meta.url)),
  'utf8',
);
const calendar = readFileSync(
  fileURLToPath(new URL('./calendar.tsx', import.meta.url)),
  'utf8',
);
const modal = readFileSync(
  fileURLToPath(
    new URL('../new-launch/manage.modal.tsx', import.meta.url)
  ),
  'utf8',
);

describe('posts SWR keys', () => {
  it('matches both the calendar range key and the list page key', () => {
    assert.equal(isPostsSwrKey('/posts-display=week'), true);
    assert.equal(isPostsSwrKey('/posts-list-page=0'), true);
    assert.equal(isPostsSwrKey('/integrations/list'), false);
    assert.equal(isPostsSwrKey(null), false);
  });
});

describe('drop a deleted group from posts caches', () => {
  it('removes every row that shares the group, including Error posts', () => {
    const rows = [
      { id: 'a', group: 'g1', state: 'PUBLISHED' },
      { id: 'b', group: 'g2', state: 'ERROR' },
      { id: 'c', group: 'g2', state: 'ERROR' },
    ];
    assert.deepEqual(dropPostGroupFromRows(rows, 'g2'), [rows[0]]);
  });

  it('drops a list page total so pagination does not keep a ghost row', () => {
    const next = dropPostGroupFromSwrData(
      {
        posts: [
          { id: 'a', group: 'keep' },
          { id: 'b', group: 'gone' },
        ],
        total: 12,
      },
      'gone'
    );
    assert.deepEqual(next, {
      posts: [{ id: 'a', group: 'keep' }],
      total: 11,
    });
  });

  it('revalidates every /posts- key instead of the bound hook that may be null', () => {
    assert.match(context, /isPostsSwrKey/);
    assert.match(context, /dropPostGroupFromSwrData/);
    assert.match(context, /dropPostGroupFromView/);
    assert.match(context, /globalMutate\(isPostsSwrKey/);
  });

  it('list and composer delete drop the group before the success toast', () => {
    assert.match(calendar, /dropPostGroupFromView\(post\.group/);
    assert.match(modal, /dropPostGroupFromView\(/);
    assert.match(modal, /existingData\.group/);
  });
});
