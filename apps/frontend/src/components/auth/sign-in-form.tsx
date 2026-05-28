'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AtSignIcon } from 'lucide-react';
import { Button } from '@gitroom/frontend/components/ui/button';
import { Input } from '@gitroom/frontend/components/ui/input';
import { getSupabaseBrowser } from '@gitroom/frontend/lib/supabase-browser';
import { safeRedirect } from '@gitroom/frontend/lib/redirects';

interface SignInFormProps {
  redirectTo?: string;
}

export function SignInForm({ redirectTo }: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const supabase = getSupabaseBrowser();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message);
      setPending(false);
      return;
    }
    // Middleware will route to /me, /onboarding, or /admin based on state.
    // safeRedirect() blocks cross-origin redirects via ?redirectTo=https://evil.com.
    router.push(safeRedirect(redirectTo, '/me'));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
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
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      {error && (
        <p className="text-caption text-danger-fg" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
