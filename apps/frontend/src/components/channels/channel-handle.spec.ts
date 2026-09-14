import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { formatChannelHandle, channelListSubtitle, channelNameWithHandle, continuePickerHandle } from './channel-handle.ts';

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

describe('continuePickerHandle', () => {
  it('returns undefined when display is empty', () => {
    assert.equal(continuePickerHandle(undefined), undefined);
    assert.equal(continuePickerHandle('  '), undefined);
  });

  it('formats the same way as formatChannelHandle when display exists', () => {
    assert.equal(continuePickerHandle('iamgokhankinay'), '@iamgokhankinay');
    assert.equal(
      continuePickerHandle('https://thegokhankinay.tumblr.com/'),
      'thegokhankinay.tumblr.com',
    );
  });
});

describe('channelNameWithHandle', () => {
  it('joins name and handle with a middle dot', () => {
    assert.equal(
      channelNameWithHandle({ name: 'GÖKHAN KINAY', display: 'iamgokhankinay' }),
      'GÖKHAN KINAY · @iamgokhankinay',
    );
  });

  it('returns only the name when display is empty', () => {
    assert.equal(
      channelNameWithHandle({ name: 'PostQueen', display: '' }),
      'PostQueen',
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

describe('Composer preview handle contract', () => {
  it('shows formatChannelHandle(display) on Instagram, Facebook, YouTube, LinkedIn, and TikTok', () => {
    const read = (rel: string) =>
      readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
    assert.match(
      read('../new-launch/providers/instagram/instagram.preview.tsx'),
      /formatChannelHandle\(integration\?\.display\)/,
    );
    assert.match(
      read('../new-launch/providers/facebook/facebook.preview.tsx'),
      /formatChannelHandle\(integration\?\.display\)/,
    );
    assert.match(
      read('../new-launch/providers/youtube/youtube.preview.tsx'),
      /formatChannelHandle\(integration\?\.display\)/,
    );
    assert.match(
      read('../new-launch/providers/linkedin/linkedin.preview.tsx'),
      /formatChannelHandle\(integration\?\.display\)/,
    );
    assert.match(
      read('../new-launch/providers/tiktok/tiktok.preview.tsx'),
      /formatChannelHandle\(integration\?\.display\)/,
    );
    assert.doesNotMatch(
      read('../new-launch/providers/tiktok/tiktok.preview.tsx'),
      /@\{integration\?\.name\}/,
    );
  });
});

describe('Continue picker handle contract', () => {
  it('does not fall back to the YouTube platform slug', () => {
    const youtube = readFileSync(
      fileURLToPath(
        new URL(
          '../new-launch/providers/continue-provider/youtube/youtube.continue.tsx',
          import.meta.url,
        ),
      ),
      'utf8',
    );
    assert.match(youtube, /continuePickerHandle\(item\.username\)/);
    assert.doesNotMatch(youtube, /item\.username \|\| 'YouTube'/);
  });
});

describe('Auto-Plugs detail handle contract', () => {
  it('uses channelListSubtitle, not name · identifier', () => {
    const plug = readFileSync(
      fileURLToPath(new URL('../plugs/plug.tsx', import.meta.url)),
      'utf8',
    );
    assert.match(plug, /channelListSubtitle\(plug\)/);
    assert.doesNotMatch(plug, /\$\{plug\.name\} · \$\{plug\.identifier\}/);
  });
});

describe('Public preview handle contract', () => {
  it('uses formatChannelHandle on the shared post page', () => {
    const page = readFileSync(
      fileURLToPath(
        new URL('../../app/(app)/(preview)/p/[id]/page.tsx', import.meta.url),
      ),
      'utf8',
    );
    assert.match(page, /formatChannelHandle\(integration\.profile\)/);
    assert.doesNotMatch(page, /function formatProfileHandle/);
  });
});

describe('Calendar chip handle contract', () => {
  it('looks up formatChannelHandle(display) for day and week cards', () => {
    const calendar = readFileSync(
      fileURLToPath(new URL('../launches/calendar.tsx', import.meta.url)),
      'utf8',
    );
    assert.match(calendar, /function postChannelHandle/);
    assert.match(
      calendar,
      /formatChannelHandle\(\s*integrations\.find\(\(item\) => item\.id === post\.integration\.id\)\?\.display\s*\)/,
    );
    assert.match(calendar, /channelHandle \? ` · \$\{channelHandle\}`/);
    assert.match(calendar, /\{\s*!!channelHandle && \(/);
  });
});

describe('Composer validation toast handle contract', () => {
  it('uses channelNameWithHandle, not a capitalized platform slug', () => {
    const modal = readFileSync(
      fileURLToPath(
        new URL('../new-launch/manage.modal.tsx', import.meta.url),
      ),
      'utf8',
    );
    assert.match(modal, /channelNameWithHandle\(/);
    assert.match(modal, /channelToastLabel\(item\)/);
    assert.doesNotMatch(modal, /capitalize\(item\.identifier/);
  });
});
