import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isLinkOauthState,
  isLoginOauthCallback,
  isLoginOauthState,
  loginOauthAuthPath,
} from './google-login-return.ts';

describe('Google login OAuth return', () => {
  it('treats login and login-nonce as sign-in state, not a YouTube channel', () => {
    assert.equal(isLoginOauthState('login'), true);
    assert.equal(isLoginOauthState('login-AbC123'), true);
    assert.equal(isLoginOauthState('AbC1234'), false);
    assert.equal(isLoginOauthState(null), false);
    assert.equal(isLoginOauthState(''), false);
  });

  it('rewrites the YouTube login callback onto /auth with provider=GOOGLE', () => {
    const search = new URLSearchParams(
      'code=oauth-code&state=login-nonce&scope=email'
    );
    assert.equal(
      isLoginOauthCallback('/integrations/social/youtube', search),
      true
    );
    assert.equal(
      loginOauthAuthPath(search),
      '/auth?code=oauth-code&state=login-nonce&scope=email&provider=GOOGLE'
    );
  });

  it('rewrites /auth/login leftover callbacks the same way', () => {
    const search = new URLSearchParams('code=oauth-code&state=login');
    assert.equal(isLoginOauthCallback('/auth/login', search), true);
    assert.equal(
      loginOauthAuthPath(search),
      '/auth?code=oauth-code&state=login&provider=GOOGLE'
    );
  });

  it('does not steal a real YouTube channel connect', () => {
    const search = new URLSearchParams('code=yt-code&state=xK9pQ2a');
    assert.equal(
      isLoginOauthCallback('/integrations/social/youtube', search),
      false
    );
  });

  it('does not rewrite Sign in without a code', () => {
    const search = new URLSearchParams('state=login-nonce');
    assert.equal(isLoginOauthCallback('/auth/login', search), false);
  });

  it('sends a linked-account Google callback to Settings → Account', () => {
    assert.equal(isLinkOauthState('link-AbC123'), true);
    assert.equal(isLoginOauthState('link-AbC123'), true);
    const search = new URLSearchParams(
      'code=oauth-code&state=link-AbC123&scope=email'
    );
    assert.equal(
      isLoginOauthCallback('/integrations/social/youtube', search),
      true
    );
    assert.equal(
      loginOauthAuthPath(search),
      '/settings?code=oauth-code&state=link-AbC123&scope=email&provider=GOOGLE&tab=account'
    );
  });
});
