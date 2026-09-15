export const dynamic = 'force-dynamic';
import { Login } from '@gitroom/frontend/components/auth/login';
import { Metadata } from 'next';
import { authShareMetadata } from '@gitroom/frontend/components/auth/auth.open-graph';

/**
 * Facebook's Sharing Debugger scrapes this public HTML after a 307 from `/`.
 * og:image has to be an absolute https PNG/JPG — the SVG favicon is ignored.
 * fb:app_id is App A (PostQueen Facebook), not Instagram or Threads.
 */
export const metadata: Metadata = {
  title: 'Login',
  ...authShareMetadata('/auth/login'),
};
export default async function Auth() {
  return <Login />;
}
