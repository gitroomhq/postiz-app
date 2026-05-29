'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@gitroom/frontend/lib/supabase-browser';

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setPending(true);
    setError(null);
    const supabase = getSupabaseBrowser();
    const { error: signOutErr } = await supabase.auth.signOut();
    if (signOutErr) {
      // Surface the failure inline and bail out — redirecting would mask
      // a still-active session and confuse the user about their auth state.
      setError(signOutErr.message);
      setPending(false);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        className="ml-2 px-3 py-1.5 rounded-md text-caption text-fgMuted hover:text-fg hover:bg-white/[0.04] transition-colors disabled:opacity-50"
      >
        {pending ? 'Signing out…' : 'Sign out'}
      </button>
      {error ? (
        <span role="alert" className="text-caption text-red-400">
          {error}
        </span>
      ) : null}
    </div>
  );
}
