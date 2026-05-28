import type { Metadata } from 'next';
import Link from 'next/link';
import { getSupabaseAdmin } from '@d3/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Admin — D3 Creator',
};

export default async function AdminPage() {
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
          Admins see everything across every creator and every platform. Use the
          public dashboard for the day-to-day roll-up, or jump to a specific
          creator below.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <article key={s.label} className="glass-elevated rounded-2xl p-6">
            <div className="text-caption text-fgMuted uppercase tracking-wide">{s.label}</div>
            <div className="text-display-2 text-fg tabular-nums mt-2">
              {Intl.NumberFormat().format(s.value)}
            </div>
          </article>
        ))}
      </section>

      <section className="flex gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 rounded-md glass-elevated text-fg hover:bg-white/[0.06] transition-colors text-label"
        >
          Open public dashboard
        </Link>
        <Link
          href="/leaderboard"
          className="inline-flex items-center px-4 py-2 rounded-md glass-elevated text-fg hover:bg-white/[0.06] transition-colors text-label"
        >
          Open public leaderboard
        </Link>
      </section>
    </div>
  );
}
