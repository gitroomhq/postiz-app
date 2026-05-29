'use client';

/**
 * AdminSearchForm — client search that soft-navigates with scroll preserved.
 *
 * A native <form method="GET"> triggers a full document navigation that resets
 * scroll to the top. This pushes the same ?q= URL via the App Router with
 * { scroll: false } so the server still re-filters but the viewport stays put,
 * matching the platform chips. The active platform filter is carried through.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@gitroom/frontend/components/ui/input';

export function AdminSearchForm({
  defaultQuery,
  platform,
}: {
  defaultQuery: string;
  platform: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(defaultQuery);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (platform) params.set('platform', platform);
    const qs = params.toString();
    router.push(qs ? `/admin/profiles?${qs}` : '/admin/profiles', { scroll: false });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by creator name or handle…"
        className="max-w-[360px]"
      />
      <button
        type="submit"
        className="px-4 rounded-md bg-aurora-cta text-brand-darker font-medium text-label hover:bg-aurora-ctaHover transition-colors"
      >
        Search
      </button>
    </form>
  );
}
