export const dynamic = 'force-dynamic';
import { Login } from '@gitroom/frontend/components/auth/login';
import { Metadata } from 'next';
import { authShareMetadata } from '@gitroom/frontend/components/auth/auth.open-graph';

/**
 * Sharing Debugger scrapes https://app.postqueen.ai/ (then used to 307 here).
 * This page is also rewritten onto `/` so the first HTML has og:* / fb:app_id.
 * og:url stays `/` — the URL Meta was asked to scrape. App A, not IG/Threads.
 */
export const metadata: Metadata = {
  title: 'Login',
  ...authShareMetadata('/'),
};
export default async function Auth() {
  return <Login />;
}
