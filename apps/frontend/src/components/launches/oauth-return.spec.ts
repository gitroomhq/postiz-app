import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { channelFocusPath, oauthReturnPath } from './oauth-return.ts';

const continueSource = readFileSync(
  fileURLToPath(new URL('./continue.integration.tsx', import.meta.url)),
  'utf8',
);
const channelsSource = readFileSync(
  fileURLToPath(
    new URL('../channels/channels.component.tsx', import.meta.url)
  ),
  'utf8',
);
const automationsSource = readFileSync(
  fileURLToPath(
    new URL('../channels/channel.automations.tsx', import.meta.url)
  ),
  'utf8',
);
const plugsPageSource = readFileSync(
  fileURLToPath(new URL('../plugs/plugs.tsx', import.meta.url)),
  'utf8',
);

describe('oauthReturnPath', () => {
  it('sends a finished connect or refresh to Channels, not Calendar', () => {
    assert.equal(
      oauthReturnPath({ added: 'youtube', msg: 'Channel Updated' }),
      '/channels?added=youtube&msg=Channel+Updated',
    );
  });

  it('keeps onboarding and precondition on /channels', () => {
    assert.equal(
      oauthReturnPath({
        added: 'youtube',
        msg: 'Channel Added',
        onboarding: true,
      }),
      '/channels?added=youtube&msg=Channel+Added&onboarding=true',
    );
    assert.equal(
      oauthReturnPath({ precondition: true }),
      '/channels?precondition=true',
    );
  });

  it('puts focus on the Channels URL without using id', () => {
    assert.equal(
      oauthReturnPath({
        added: 'facebook',
        focus: 'int-uuid',
        msg: 'Channel Added',
      }),
      '/channels?added=facebook&focus=int-uuid&msg=Channel+Added',
    );
    assert.doesNotMatch(
      oauthReturnPath({ added: 'facebook', focus: 'int-uuid' }),
      /[?&]id=/,
    );
  });

  it('builds a notification reconnect URL with channel + focus', () => {
    assert.equal(
      channelFocusPath({ provider: 'youtube', focus: 'yt-row-1' }),
      '/channels?channel=youtube&focus=yt-row-1',
    );
    assert.equal(
      channelFocusPath({ provider: 'youtube' }),
      '/channels?channel=youtube',
    );
  });
});

describe('OAuth continue default return', () => {
  it('uses oauthReturnPath instead of /launches', () => {
    assert.match(continueSource, /oauthReturnPath\(/);
    assert.doesNotMatch(continueSource, /`\/launches\?/);
  });

  it('passes focus as the integration uuid on one-step and two-step success', () => {
    assert.match(continueSource, /focus:\s*id/);
    assert.match(continueSource, /savedIds\[savedIds\.length - 1\]/);
    assert.match(continueSource, /twoStepState\.integrationId/);
  });

  it('refetches /integrations/list after a finished connect and after a two-step save', () => {
    // Threads / Instagram Standalone: social-connect 201 → Channel Updated.
    // Facebook / Instagram / YouTube: picker save → Channel Added.
    // useIntegrationList has revalidateOnFocus / revalidateIfStale off, so
    // without this mutate the CHANNELS rail keeps the pre-connect snapshot.
    assert.match(continueSource, /mutate\('\/integrations\/list'\)/);
    const refreshes = continueSource.match(
      /await refreshIntegrationsList\(\)/g
    );
    assert.equal(refreshes?.length, 2);
  });
});

describe('Channels OAuth landing', () => {
  it('mutates the list when ?added= lands and waits for the focused row', () => {
    assert.match(
      channelsSource,
      /selectAddedIntegration\(\s*list,\s*providerHint,\s*focusId/,
    );
    assert.match(channelsSource, /searchParams\.get\('channel'\)/);
    assert.match(channelsSource, /void mutate\(\)\.finally/);
    assert.match(channelsSource, /if \(!match\?\.id\) \{/);
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

describe('Channel automations', () => {
  it('is opt-in per provider: no panel without a catalog match, Off until Set up plug', () => {
    // Facebook / Instagram / Instagram Standalone / YouTube have no @Plug.
    // Threads does; "Auto plug post Off" after connect is the unset state,
    // not a failed activation. Connecting must not flip activated.
    assert.match(automationsSource, /if \(!match\?\.plugs\?\.length\) \{/);
    assert.match(automationsSource, /Set up plug/);
    assert.match(
      plugsPageSource,
      /Auto-plugs work on X, LinkedIn Page, Threads and Bluesky/
    );
  });
});
