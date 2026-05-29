'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Button } from '@gitroom/frontend/components/ui/button';
import { Input } from '@gitroom/frontend/components/ui/input';
import { updateAccount } from './actions';

interface AccountFormProps {
  defaultDisplayName?: string | null;
  defaultDashboardUrl?: string | null;
  defaultLeaderboardUrl?: string | null;
}

export function AccountForm({
  defaultDisplayName,
  defaultDashboardUrl,
  defaultLeaderboardUrl,
}: AccountFormProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateAccount(formData);
      if (result.ok === false) setError(result.error);
      else setSaved(true);
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
          onChange={() => setSaved(false)}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-label text-fgMuted">
          Dashboard URL <span className="text-fgSubtle">(optional)</span>
        </span>
        <Input
          name="dashboardUrl"
          type="url"
          placeholder="https://…"
          defaultValue={defaultDashboardUrl ?? ''}
          onChange={() => setSaved(false)}
        />
        <span className="text-caption text-fgSubtle">
          An external dashboard you want D3 to surface in your personal view.
        </span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-label text-fgMuted">
          Leaderboard URL <span className="text-fgSubtle">(optional)</span>
        </span>
        <Input
          name="leaderboardUrl"
          type="url"
          placeholder="https://…"
          defaultValue={defaultLeaderboardUrl ?? ''}
          onChange={() => setSaved(false)}
        />
        <span className="text-caption text-fgSubtle">
          An external leaderboard you want D3 to surface in your personal view.
        </span>
      </label>

      {error && (
        <p className="text-caption text-danger-fg" role="alert">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="text-caption text-emerald-400" role="status">
          Saved ✓
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
