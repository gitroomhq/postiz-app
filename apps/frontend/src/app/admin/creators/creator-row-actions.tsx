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
        className="px-[12px] py-[6px] bg-lamboIron hover:bg-lamboCharcoal text-[12px] text-white uppercase tracking-[0.14px] transition-colors"
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={onDelete}
        className="text-[12px] text-lamboAsh underline uppercase tracking-[0.14px] hover:text-white transition-colors"
      >
        Delete
      </button>
    </div>
  );
}
