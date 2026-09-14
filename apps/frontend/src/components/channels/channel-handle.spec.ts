import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { formatChannelHandle, channelListSubtitle } from './channel-handle.ts';

const detailSource = readFileSync(
  fileURLToPath(new URL('./channels.component.tsx', import.meta.url)),
  'utf8',
);

describe('formatChannelHandle', () => {
  it('returns empty when display is missing', () => {
    assert.equal(formatChannelHandle(undefined), '');
    assert.equal(formatChannelHandle(null), '');
    assert.equal(formatChannelHandle('  '), '');
  });

  it('keeps an at-prefixed YouTube customUrl', () => {
    assert.equal(formatChannelHandle('@thegokhankinay'), '@thegokhankinay');
  });

  it('prefixes a bare handle', () => {
    assert.equal(formatChannelHandle('iamgokhankinay'), '@iamgokhankinay');
  });

  it('shows a Tumblr URL as host plus path, without an extra at-sign', () => {
    assert.equal(
      formatChannelHandle('https://thegokhankinay.tumblr.com/'),
      'thegokhankinay.tumblr.com',
    );
    assert.equal(
      formatChannelHandle('https://www.tumblr.com/studio'),
      'tumblr.com/studio',
    );
  });
});

describe('Channels detail handle contract', () => {
  it('renders formatChannelHandle(current.display), not @name', () => {
    assert.match(
      detailSource,
      /formatChannelHandle\(\s*current\?\.display\s*\)/,
    );
    assert.match(detailSource, /\{channelHandle\}/);
    assert.doesNotMatch(detailSource, /current\.name\?\.replace\(\/\^@\//);
  });
});

describe('Channels list handle contract', () => {
  it('renders formatChannelHandle(integration.display) before the platform slug', () => {
    assert.match(
      detailSource,
      /formatChannelHandle\(\s*integration\.display\s*\)\s*\|\|/,
    );
  });
});

describe('channelListSubtitle', () => {
  it('prefers the formatted handle over the platform slug', () => {
    assert.equal(
      channelListSubtitle({ display: 'thegokhankinay', identifier: 'youtube' }),
      '@thegokhankinay',
    );
  });

  it('falls back to the platform slug when display is empty', () => {
    assert.equal(
      channelListSubtitle({ display: '', identifier: 'facebook' }),
      'facebook',
    );
  });
});

describe('Analytics handle contract', () => {
  it('uses channelListSubtitle, not @name', () => {
    const analytics = readFileSync(
      fileURLToPath(
        new URL('../platform-analytics/platform.analytics.tsx', import.meta.url),
      ),
      'utf8',
    );
    assert.match(analytics, /channelListSubtitle\(currentIntegration\)/);
    assert.match(analytics, /channelListSubtitle\(integration\)/);
    assert.doesNotMatch(
      analytics,
      /currentIntegration\.name \|\| currentIntegration\.identifier/,
    );
  });
});

describe('Plugs and Agents list handle contract', () => {
  it('shows the handle on both channel columns', () => {
    const plugs = readFileSync(
      fileURLToPath(new URL('../plugs/plugs.tsx', import.meta.url)),
      'utf8',
    );
    const agents = readFileSync(
      fileURLToPath(new URL('../agents/agent.tsx', import.meta.url)),
      'utf8',
    );
    assert.match(plugs, /channelListSubtitle\(integration\)/);
    assert.match(agents, /channelListSubtitle\(integration\)/);
  });
});

describe('Channel pick list handle contract', () => {
  it('uses channelListSubtitle, not the platform slug', () => {
    const pick = readFileSync(
      fileURLToPath(
        new URL('../launches/channel.pick.list.tsx', import.meta.url),
      ),
      'utf8',
    );
    assert.match(pick, /channelListSubtitle\(integration\)/);
    assert.doesNotMatch(
      pick,
      /text-pqMuted">\s*\{integration\.identifier\}/,
    );
  });
});
