'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@gitroom/frontend/lib/supabase-browser';

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handle() {
    setPending(true);
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      className="ml-2 px-3 py-1.5 rounded-md text-caption text-fgMuted hover:text-fg hover:bg-white/[0.04] transition-colors disabled:opacity-50"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
