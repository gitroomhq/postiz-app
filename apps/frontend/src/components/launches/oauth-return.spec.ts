import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { oauthReturnPath } from './oauth-return.ts';

const continueSource = readFileSync(
  fileURLToPath(new URL('./continue.integration.tsx', import.meta.url)),
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
});
