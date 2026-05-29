'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Button } from '@gitroom/frontend/components/ui/button';
import { Input } from '@gitroom/frontend/components/ui/input';
import { updateAccount } from './actions';

interface AccountFormProps {
  defaultDisplayName?: string | null;
}

export function AccountForm({ defaultDisplayName }: AccountFormProps) {
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
          placeholder="How you'd like to appear"
          defaultValue={defaultDisplayName ?? ''}
          onChange={() => setSaved(false)}
        />
        <span className="text-caption text-fgSubtle">
          The name shown for your creator across D3.
        </span>
      </label>

      {error && (
        <p className="text-caption text-fgMuted" role="alert">
          ⚠ {error}
        </p>
      )}
      {saved && !error && (
        <p className="text-caption text-fg" role="status">
          ✓ Saved
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
