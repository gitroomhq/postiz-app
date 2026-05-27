import { Metadata } from 'next';
import Link from 'next/link';
import { CreatorForm } from '../creator-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Add creator — D3 Creator Admin',
  description: '',
};

export default function NewCreatorPage() {
  return (
    <div className="flex flex-col gap-10 max-w-[680px] pt-12 pb-24">
      <header>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-caption text-fgMuted hover:text-fg transition-colors mb-6"
        >
          ← Back to creators
        </Link>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted mb-4">
          New creator
        </span>
        <h1 className="text-display-2 text-fg mb-4">Add a creator</h1>
        <p className="text-body-lg text-fgMuted">
          Give them a display name, pick a URL slug, and paste in their platform
          URLs. They show up on the public showcase as soon as the scraper
          indexes them.
        </p>
      </header>

      <CreatorForm mode="create" />
    </div>
  );
}
