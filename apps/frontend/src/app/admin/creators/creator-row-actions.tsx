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
    <div className="flex items-center justify-end gap-[8px]">
      <Link
        href={`/admin/creators/${encodeURIComponent(id)}/edit`}
        className="px-[12px] py-[6px] rounded-[8px] bg-[#0E0E0E] border border-[#252525] hover:border-[#1D4ED8]/40 text-[12px] text-white font-semibold transition-colors"
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={onDelete}
        className="px-[12px] py-[6px] rounded-[8px] bg-[#0E0E0E] border border-[#252525] hover:border-[#f97066]/60 text-[12px] text-[#f97066] font-semibold transition-colors"
      >
        Delete
      </button>
    </div>
  );
}
