'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Button } from '@gitroom/frontend/components/ui/button';
import { Input } from '@gitroom/frontend/components/ui/input';
import { saveOnboarding } from './actions';

interface OnboardingFormProps {
  defaultDisplayName?: string | null;
  defaultDashboardUrl?: string | null;
  defaultLeaderboardUrl?: string | null;
}

export function OnboardingForm({
  defaultDisplayName,
  defaultDashboardUrl,
  defaultLeaderboardUrl,
}: OnboardingFormProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveOnboarding(formData);
      if (result && result.ok === false) setError(result.error);
      // On success the server action redirects to /me (never returns).
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-label text-fgMuted">Display name</span>
        <Input
          name="displayName"
          required
          maxLength={120}
          placeholder="How you'd like your creator to appear"
          defaultValue={defaultDisplayName ?? ''}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-label text-fgMuted">Dashboard URL</span>
        <Input
          name="dashboardUrl"
          type="url"
          required
          placeholder="https://…"
          defaultValue={defaultDashboardUrl ?? ''}
        />
        <span className="text-caption text-fgSubtle">
          The dashboard you want D3 to surface in your personal view.
        </span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-label text-fgMuted">Leaderboard URL</span>
        <Input
          name="leaderboardUrl"
          type="url"
          required
          placeholder="https://…"
          defaultValue={defaultLeaderboardUrl ?? ''}
        />
        <span className="text-caption text-fgSubtle">
          The leaderboard you want D3 to surface in your personal view.
        </span>
      </label>

      {error && (
        <p className="text-caption text-danger-fg" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : 'Save and continue'}
      </Button>
    </form>
  );
}
