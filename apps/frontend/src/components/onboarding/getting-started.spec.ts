import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  GETTING_STARTED_TOTAL,
  GETTING_STARTED_CONNECT_ICONS,
  gettingStartedDismissKey,
  gettingStartedProgress,
  gettingStartedVisible,
} from './getting-started.ts';

const hook = readFileSync(
  fileURLToPath(new URL('./use.getting.started.ts', import.meta.url)),
  'utf8',
);
const widget = readFileSync(
  fileURLToPath(new URL('./getting.started.tsx', import.meta.url)),
  'utf8',
);
const rail = readFileSync(
  fileURLToPath(new URL('../new-layout/rail.tsx', import.meta.url)),
  'utf8',
);
const help = readFileSync(
  fileURLToPath(new URL('../new-layout/help.menu.tsx', import.meta.url)),
  'utf8',
);

describe('gettingStartedProgress', () => {
  it('counts three steps and treats a publish as a scheduled post too', () => {
    assert.equal(GETTING_STARTED_TOTAL, 3);
    assert.deepEqual(
      gettingStartedProgress({
        hasChannel: false,
        hasScheduled: false,
        hasPublished: false,
      }),
      {
        channel: false,
        scheduled: false,
        published: false,
        done: 0,
        total: 3,
        complete: false,
      },
    );
    assert.equal(
      gettingStartedProgress({
        hasChannel: true,
        hasScheduled: false,
        hasPublished: false,
      }).done,
      1,
    );
    assert.equal(
      gettingStartedProgress({
        hasChannel: true,
        hasScheduled: true,
        hasPublished: false,
      }).done,
      2,
    );
    const publishedNow = gettingStartedProgress({
      hasChannel: true,
      hasScheduled: false,
      hasPublished: true,
    });
    assert.equal(publishedNow.scheduled, true);
    assert.equal(publishedNow.published, true);
    assert.equal(publishedNow.complete, true);
    assert.equal(publishedNow.done, 3);
  });

  it('does not complete when a post exists but no channel is connected', () => {
    const progress = gettingStartedProgress({
      hasChannel: false,
      hasScheduled: false,
      hasPublished: true,
    });
    assert.equal(progress.channel, false);
    assert.equal(progress.scheduled, true);
    assert.equal(progress.published, true);
    assert.equal(progress.complete, false);
    assert.equal(progress.done, 2);
  });
});

describe('gettingStartedVisible', () => {
  it('waits for probes, then hides only a dismissed complete checklist', () => {
    assert.equal(
      gettingStartedVisible({
        ready: false,
        complete: false,
        dismissed: false,
      }),
      false,
    );
    assert.equal(
      gettingStartedVisible({
        ready: true,
        complete: false,
        dismissed: false,
      }),
      true,
    );
    assert.equal(
      gettingStartedVisible({
        ready: true,
        complete: true,
        dismissed: false,
      }),
      true,
    );
    assert.equal(
      gettingStartedVisible({
        ready: true,
        complete: true,
        dismissed: true,
      }),
      false,
    );
    assert.equal(
      gettingStartedVisible({
        ready: true,
        complete: false,
        dismissed: true,
      }),
      true,
    );
  });

  it('scopes dismiss to the organization', () => {
    assert.equal(gettingStartedDismissKey('org-a'), 'pq-gs-dismissed:org-a');
    assert.notEqual(
      gettingStartedDismissKey('org-a'),
      gettingStartedDismissKey('org-b'),
    );
  });
});

describe('getting started wiring', () => {
  it('probes live channel and post lists without treating a loading empty as none', () => {
    assert.match(hook, /gettingStartedProgress/);
    assert.match(hook, /postsListHasRows/);
    assert.match(hook, /\/integrations\/list/);
    assert.match(hook, /state=scheduled/);
    assert.match(hook, /state=published/);
    assert.doesNotMatch(hook, /fallbackData:\s*\[\]/);
    assert.match(hook, /#gs:/);
    assert.match(hook, /refreshInterval/);
  });

  it('lives in the rail footer as a popover or sheet, not a Settings overlay', () => {
    assert.match(rail, /<GettingStarted/);
    assert.match(rail, /data-sb-foot/);
    assert.match(widget, /data-pq="getting-started"/);
    assert.match(widget, /MobileSheet/);
    assert.match(widget, /useAnchoredPopover/);
    assert.match(widget, /data-pq="create-post"/);
    assert.match(widget, /touch \? 'h-\[44px\]/);
    assert.doesNotMatch(widget, /\/settings/);
    assert.doesNotMatch(widget, /useAddProvider/);
  });

  it('shows a Buffer-style channel strip that opens /channels', () => {
    assert.deepEqual([...GETTING_STARTED_CONNECT_ICONS], [
      'facebook',
      'instagram',
      'x',
      'youtube',
    ]);
    assert.match(widget, /GETTING_STARTED_CONNECT_ICONS/);
    assert.match(widget, /data-pq="getting-started-channels"/);
    assert.match(widget, /data-pq="getting-started-add-channel"/);
    assert.match(widget, /href="\/channels"/);
    assert.match(widget, /Connect your channel/);
    assert.match(widget, /flex-wrap/);
    assert.match(widget, /\/icons\/platforms\/\$\{id\}\.png/);
  });

  it('retires Help Take a tour once the checklist is complete, not only after a publish', () => {
    assert.match(help, /useGettingStarted/);
    assert.doesNotMatch(help, /useHasPublishedPost/);
    assert.match(help, /ready && .*\.complete/);
  });
});
