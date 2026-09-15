/**
 * Google sign-in shares the YouTube OAuth client, so consent returns to
 * `/integrations/social/youtube?code=…&state=login-…`.
 *
 * The Sign in page does not exchange that code. `/auth` (Register) does:
 * it POSTs `/auth/oauth/GOOGLE/exists`. Sending the callback to `/auth/login`
 * drops the user back on the same panel with an unused code.
 */

export const isLoginOauthState = (state: string | null) =>
  !!state && (state.startsWith('login') || state.startsWith('link-'));

export const isLinkOauthState = (state: string | null) =>
  !!state && state.startsWith('link-');

export const isLoginOauthCallback = (
  pathname: string,
  search: URLSearchParams
) => {
  const code = search.get('code');
  if (!code || !isLoginOauthState(search.get('state'))) return false;
  return (
    pathname.startsWith('/integrations/social/') || pathname === '/auth/login'
  );
};

export const loginOauthAuthPath = (search: URLSearchParams) => {
  const params = new URLSearchParams(search);
  if (!params.get('provider')) {
    params.set('provider', 'GOOGLE');
  }
  if (isLinkOauthState(params.get('state'))) {
    params.set('tab', 'account');
    return `/settings?${params.toString()}`;
  }
  return `/auth?${params.toString()}`;
};
