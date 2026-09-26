import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// postmonster: registration lives on /auth/register now; /auth keeps working
// as the historical entry point (links, proxy redirects, OAuth callbacks)
export default async function Auth(params: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = (await params?.searchParams) || {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (typeof value === 'string') {
      query.set(key, value);
    }
  }
  const qs = query.toString();
  redirect(`/auth/register${qs ? `?${qs}` : ''}`);
}
