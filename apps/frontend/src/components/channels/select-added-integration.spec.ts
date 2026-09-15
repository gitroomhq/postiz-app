import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { selectAddedIntegration } from './select-added-integration.ts';

const channelsSource = readFileSync(
  fileURLToPath(new URL('./channels.component.tsx', import.meta.url)),
  'utf8',
);

describe('selectAddedIntegration', () => {
  it('returns nothing when added is missing or the list is empty', () => {
    assert.equal(selectAddedIntegration(undefined, 'youtube'), undefined);
    assert.equal(selectAddedIntegration([], 'youtube'), undefined);
    assert.equal(
      selectAddedIntegration([{ id: '1', identifier: 'youtube' }], ''),
      undefined,
    );
    assert.equal(
      selectAddedIntegration([{ id: '1', identifier: 'youtube' }], null),
      undefined,
    );
  });

  it('selects the only integration whose identifier matches added', () => {
    const youtube = { id: 'yt-1', identifier: 'youtube' };
    const list = [
      { id: 'x-1', identifier: 'x' },
      youtube,
      { id: 'ig-1', identifier: 'instagram' },
    ];
    assert.equal(selectAddedIntegration(list, 'youtube'), youtube);
  });

  it('picks the last match in list order when several share a provider', () => {
    const first = { id: 'yt-old', identifier: 'youtube' };
    const last = { id: 'yt-new', identifier: 'youtube' };
    const list = [{ id: 'x-1', identifier: 'x' }, first, last];
    assert.equal(selectAddedIntegration(list, 'youtube'), last);
  });

  it('prefers the newest createdAt when several share a provider', () => {
    const older = {
      id: 'yt-old',
      identifier: 'youtube',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const newer = {
      id: 'yt-new',
      identifier: 'youtube',
      createdAt: '2026-09-12T00:00:00.000Z',
    };
    const list = [newer, older];
    assert.equal(selectAddedIntegration(list, 'youtube'), newer);
  });

  it('returns nothing when no identifier matches', () => {
    assert.equal(
      selectAddedIntegration([{ id: 'x-1', identifier: 'x' }], 'youtube'),
      undefined,
    );
  });

  it('selects the row whose id matches focus, even if another provider is first', () => {
    const facebook = { id: 'fb-1', identifier: 'facebook' };
    const youtube = { id: 'yt-1', identifier: 'youtube' };
    const list = [youtube, facebook];
    assert.equal(
      selectAddedIntegration(list, 'facebook', 'fb-1'),
      facebook,
    );
  });

  it('falls through to identifier match when focus is missing from the list', () => {
    const facebook = { id: 'fb-1', identifier: 'facebook' };
    const youtube = { id: 'yt-1', identifier: 'youtube' };
    const list = [youtube, facebook];
    assert.equal(
      selectAddedIntegration(list, 'facebook', 'missing'),
      facebook,
    );
  });

  it('returns nothing when focus is missing and the list has no identifier match', () => {
    assert.equal(
      selectAddedIntegration(
        [{ id: 'yt-1', identifier: 'youtube' }],
        'facebook',
        'fb-1',
      ),
      undefined,
    );
  });
});

describe('Channels added= focus contract', () => {
  it('waits for a matching row and does not fall back to list[0]', () => {
    assert.match(
      channelsSource,
      /selectAddedIntegration\(\s*list,\s*providerHint,\s*focusId/,
    );
    assert.match(channelsSource, /searchParams\.get\('channel'\)/);
    assert.match(channelsSource, /if \(!match\?\.id\) \{/);
    assert.match(channelsSource, /void mutate\(\)\.finally/);
    assert.match(
      channelsSource,
      /stripChannelQuery\(\['added', 'msg', 'focus', 'channel'\]\)/,
    );
    assert.doesNotMatch(
      channelsSource,
      /else if \(list\[0\]\?\.id\) \{\s*setSelected\(list\[0\]\.id\)/,
    );
  });
});
