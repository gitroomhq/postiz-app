'use client';

import { ReactNode, useCallback } from 'react';
import { FetchWrapperComponent } from '@gitroom/helpers/utils/custom.fetch';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useReturnUrl } from '@gitroom/frontend/app/(app)/auth/return.url.component';
import { useVariables } from '@gitroom/react/helpers/variable.context';
export default function LayoutContext(params: { children: ReactNode }) {
  if (params?.children) {
    // eslint-disable-next-line react/no-children-prop
    return <LayoutContextInner children={params.children} />;
  }
  return <></>;
}
export function setCookie(cname: string, cvalue: string, exdays: number) {
  if (typeof document === 'undefined') {
    return;
  }
  const d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  const expires = 'expires=' + d.toUTCString();
  document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
}
function LayoutContextInner(params: { children: ReactNode }) {
  const returnUrl = useReturnUrl();
  const { backendUrl, isGeneral, isSecured } = useVariables();
  // In desktop/local mode, WKWebView's cookie store may not sync document.cookie
  // writes to the HTTP layer before a full-page navigation fires. To ensure the
  // Next.js middleware can authenticate the user on the navigation request, we
  // pass the JWT as a ?loggedAuth= query parameter. The middleware reads it,
  // sets a proper HttpOnly cookie, and redirects to the clean URL.
  // Only done for localhost to avoid JWT exposure in URLs on production.
  const isLocalhost =
    typeof backendUrl === 'string' &&
    (backendUrl.startsWith('http://localhost') ||
      backendUrl.startsWith('http://127.'));
  const afterRequest = useCallback(
    async (url: string, options: RequestInit, response: Response) => {
      if (
        typeof window !== 'undefined' &&
        window.location.href.includes('/p/')
      ) {
        return true;
      }
      const headerAuth =
        response?.headers?.get('auth') || response?.headers?.get('Auth');
      const showOrg =
        response?.headers?.get('showorg') || response?.headers?.get('Showorg');
      const impersonate =
        response?.headers?.get('impersonate') ||
        response?.headers?.get('Impersonate');
      const logout =
        response?.headers?.get('logout') || response?.headers?.get('Logout');
      if (headerAuth) {
        setCookie('auth', headerAuth, 365);
      }
      if (showOrg) {
        setCookie('showorg', showOrg, 365);
      }
      if (impersonate) {
        setCookie('impersonate', impersonate, 365);
      }
      if (logout && !isSecured) {
        setCookie('auth', '', -10);
        setCookie('showorg', '', -10);
        setCookie('impersonate', '', -10);
        window.location.href = '/';
        return true;
      }
      const reloadOrOnboarding =
        response?.headers?.get('reload') ||
        response?.headers?.get('onboarding');
      if (reloadOrOnboarding) {
        const getAndClear = returnUrl.getAndClear();
        if (getAndClear) {
          // In localhost mode, include loggedAuth so the middleware can
          // authenticate via URL param even if cookies haven't synced yet.
          const authParam =
            isLocalhost && headerAuth
              ? `${getAndClear.includes('?') ? '&' : '?'}loggedAuth=${encodeURIComponent(headerAuth)}`
              : '';
          window.location.href = getAndClear + authParam;
          return true;
        }
      }
      if (response?.headers?.get('onboarding')) {
        // Include loggedAuth param for localhost/desktop: WKWebView's async cookie
        // sync means the Set-Cookie from the backend may not reach the Next.js
        // middleware before this navigation fires. The middleware will strip it,
        // set a proper cookie, and redirect to the clean URL.
        const authParam =
          isLocalhost && headerAuth
            ? `&loggedAuth=${encodeURIComponent(headerAuth)}`
            : '';
        window.location.href = isGeneral
          ? `/launches?onboarding=true${authParam}`
          : `/analytics?onboarding=true${authParam}`;
        return true;
      }

      if (response?.headers?.get('reload')) {
        if (isLocalhost && headerAuth) {
          // In desktop/localhost mode, reload() depends on WKWebView syncing
          // document.cookie to its HTTP cookie store before the request fires.
          // Instead, navigate to the current URL with loggedAuth so the middleware
          // sets a persistent HttpOnly cookie and redirects to the clean URL.
          const reloadUrl = new URL(window.location.href);
          reloadUrl.searchParams.set('loggedAuth', headerAuth);
          window.location.href = reloadUrl.toString();
        } else {
          window.location.reload();
        }
        return true;
      }

      if (response.status === 401 || response?.headers?.get('logout')) {
        // Always clear JavaScript-accessible auth cookies regardless of isSecured.
        // In desktop (DESKTOP_COOKIE_MODE) mode the JWT is stored in document.cookie
        // via setCookie() and must be cleared here to prevent a redirect loop where
        // a stale cookie causes repeated 401s (e.g. after a database wipe on restart).
        // In production HTTPS mode these document.cookie values are empty (the real
        // auth uses HTTP-only cookies set by the server), so clearing them is a no-op.
        setCookie('auth', '', -10);
        setCookie('showorg', '', -10);
        setCookie('impersonate', '', -10);
        // Don't navigate away from auth pages (e.g. wrong password on login form).
        // Navigating away would swallow the error before the form can display it.
        // Use /auth/logout so Next.js middleware atomically clears HttpOnly cookies
        // and redirects to /auth/login, preventing redirect loops with stale tokens.
        if (!window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth/logout';
        }
        return true;
      }
      if (response.status === 406) {
        if (
          await deleteDialog(
            'You are currently on trial, in order to use the feature you must finish the trial',
            'Finish the trial, charge me now',
            'Trial',

          )
        ) {
          window.open('/billing?finishTrial=true', '_blank');
          return false;
        }
        return false;
      }

      if (response.status === 402) {
        if (
          await deleteDialog(
            (
              await response.json()
            ).message,
            'Move to billing',
            'Payment Required'
          )
        ) {
          window.open('/billing', '_blank');
          return false;
        }
        return true;
      }
      return true;
    },
    []
  );
  return (
    <FetchWrapperComponent baseUrl={backendUrl} afterRequest={afterRequest}>
      {params?.children || <></>}
    </FetchWrapperComponent>
  );
}
