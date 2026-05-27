'use client';

import Link from 'next/link';

interface Props {
  id: string;
  name: string;
}

export function CreatorRowActions({ id, name }: Props) {
  const onDelete = () => {
    const confirmed = window.confirm(
      `Delete creator "${name}"? This removes them from the showcase.`
    );
    if (!confirmed) return;
    window.alert(
      'Delete wiring lands with the scraper backend. The form is ready; the DB call is not.'
    );
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/admin/creators/${encodeURIComponent(id)}/edit`}
        className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-caption text-fg hover:bg-white/[0.12] hover:border-white/20 transition-[background-color,border-color] duration-180 ease-out"
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={onDelete}
        className="px-3 py-1.5 rounded-lg bg-brand-900/30 border border-brand-900/60 text-caption text-brand-100 hover:bg-brand-900/50 hover:border-brand-900 transition-[background-color,border-color] duration-180 ease-out"
      >
        Delete
      </button>
    </div>
  );
}
