import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { getAuthContext } from '@gitroom/frontend/lib/auth';
import { getSupabaseRoute } from '@gitroom/frontend/lib/supabase-route';

import { AccountForm } from './account-form';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Account — D3 Creator',
};

export default async function AccountPage() {
  const auth = await getAuthContext();
  if (!auth) redirect('/login');
  if (auth.role === 'admin') redirect('/admin');

  // Current display name lives on the linked creator row (may not exist yet for
  // a brand-new creator — that's fine, the field starts blank and saving
  // provisions it).
  let displayName = '';
  const creatorId = auth.creatorLink?.creator_id ?? null;
  if (creatorId) {
    const sb = await getSupabaseRoute();
    const { data } = await sb
      .from('creator')
      .select('display_name')
      .eq('id', creatorId)
      .maybeSingle();
    displayName = data?.display_name ?? '';
  }

  return (
    <div className="flex flex-col gap-10 pt-12 pb-24 max-w-[640px]">
      <header>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted mb-6">
          <span className="inline-block size-1.5 rounded-full bg-aurora-cta" />
          Account
        </span>
        <h1 className="text-display-2 text-fg mb-4">Your account.</h1>
        <p className="text-body-lg text-fgMuted">
          Signed in as <span className="text-fg">{auth.email}</span>. Manage how
          your creator appears.
        </p>
      </header>

      <AccountForm defaultDisplayName={displayName} />

      <section className="glass-subtle border border-borderGlass rounded-2xl p-6 flex flex-col gap-2">
        <h2 className="text-heading text-fg">Tracked profiles</h2>
        <p className="text-body text-fgMuted">
          Add and manage the Instagram, TikTok, Facebook, RedNote, or Douyin URLs
          D3 scrapes for you. Stats appear on your dashboard once collected.
        </p>
        <Link
          href="/me/profiles"
          className="text-body text-aurora-cta underline underline-offset-4 mt-1"
        >
          Manage tracked URLs →
        </Link>
      </section>
    </div>
  );
}
