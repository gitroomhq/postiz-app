import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin } from '@d3/database';
import { getAuthContext } from '@gitroom/frontend/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Admin — D3 Creator',
};

export default async function AdminPage() {
  // Defense-in-depth: layout already gates on role=admin, but if a future
  // refactor breaks layout ordering, re-check here before touching service-role.
  const auth = await getAuthContext();
  if (!auth) redirect('/login');
  if (auth.role !== 'admin') redirect('/me');

  const admin = getSupabaseAdmin();

  const [{ count: creatorCount }, { count: profileCount }, { count: userCount }] =
    await Promise.all([
      admin.from('creator').select('*', { count: 'exact', head: true }),
      admin.from('profile').select('*', { count: 'exact', head: true }),
      admin.from('user_role').select('*', { count: 'exact', head: true }),
    ]);

  const stats = [
    { label: 'Creators', value: creatorCount ?? 0 },
    { label: 'Platform profiles', value: profileCount ?? 0 },
    { label: 'Users', value: userCount ?? 0 },
  ];

  return (
    <div className="flex flex-col gap-10 pt-12 pb-24">
      <header className="max-w-[760px]">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-aurora-cta mb-6">
          <span className="inline-block size-1.5 rounded-full bg-aurora-cta" />
          Admin
        </span>
        <h1 className="text-display-2 text-fg mb-4">Full agency view.</h1>
        <p className="text-body-lg text-fgMuted max-w-[600px]">
          Everything across every creator and every platform. Jump into an
          account to review its profiles, growth, and pending claims.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href="/admin/profiles"
            className="glass-elevated rounded-2xl p-6 hover:bg-white/[0.04] hover:border-borderGlassStrong transition-colors"
          >
            <div className="text-caption text-fgMuted">{s.label}</div>
            <div className="text-display-2 text-fg tabular-nums mt-2">
              {Intl.NumberFormat().format(s.value)}
            </div>
          </Link>
        ))}
      </section>

      <section className="flex flex-wrap gap-3">
        <Link
          href="/admin/profiles"
          className="inline-flex items-center px-4 py-2 rounded-md bg-aurora-cta text-brand-darker hover:bg-aurora-ctaHover transition-colors text-label"
        >
          Manage accounts →
        </Link>
      </section>
    </div>
  );
}
