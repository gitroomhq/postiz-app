import { cookies } from 'next/headers';

// Server-only auth check. The proxy is the primary gate (it bounces unauth
// visitors away from `/admin/*` before any page renders), but components
// that want to render admin-only UI on PUBLIC pages — e.g. inline "Edit"
// shortcuts on a creator profile — call this directly.
//
// We only verify that an `auth` cookie exists. The cookie itself is a
// Postiz JWT validated by the backend on any privileged API call, so a
// fabricated cookie can render the UI but cannot perform any action.
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const auth = store.get('auth')?.value;
  return Boolean(auth);
}
