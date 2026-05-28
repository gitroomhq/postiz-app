'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AtSignIcon } from 'lucide-react';
import { Button } from '@gitroom/frontend/components/ui/button';
import { Input } from '@gitroom/frontend/components/ui/input';
import { getSupabaseBrowser } from '@gitroom/frontend/lib/supabase-browser';

export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);

    const supabase = getSupabaseBrowser();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback?redirectTo=/onboarding`
            : undefined,
        data: { display_name: displayName || null },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setPending(false);
      return;
    }

    // If email confirmation is enabled, session will be null.
    if (!data.session) {
      setInfo(
        'Check your inbox to confirm your email. After confirming you can sign in and finish onboarding.',
      );
      setPending(false);
      return;
    }

    router.push('/onboarding');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-label text-fgMuted">Display name</span>
        <Input
          type="text"
          required
          autoComplete="name"
          placeholder="Your full name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-label text-fgMuted">Email</span>
        <div className="relative">
          <AtSignIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-fgSubtle pointer-events-none" />
          <Input
            type="email"
            required
            autoComplete="email"
            placeholder="you@agency.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9"
          />
        </div>
      </label>

      <label className="block space-y-1.5">
        <span className="text-label text-fgMuted">Password</span>
        <Input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      {error && (
        <p className="text-caption text-danger-fg" role="alert">
          {error}
        </p>
      )}
      {info && (
        <p className="text-caption text-fgMuted" role="status">
          {info}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
