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
    <div className="flex flex-col gap-[24px] max-w-[680px]">
      <div>
        <Link
          href="/admin"
          className="text-[13px] text-[#9c9c9c] hover:text-white transition-colors mb-[12px] inline-block"
        >
          ← Back to creators
        </Link>
        <p className="text-[13px] uppercase tracking-[2px] text-[#1D4ED8] font-semibold mb-[8px]">
          New creator
        </p>
        <h1 className="text-[28px] md:text-[36px] font-bold text-white leading-[1.1] tracking-tight mb-[8px]">
          Add a creator
        </h1>
        <p className="text-[14px] text-[#c8c8c8] leading-[1.6]">
          Give them a display name, pick a URL slug, and paste in their
          platform URLs. They show up on the public showcase as soon as the
          scraper indexes them.
        </p>
      </div>

      <CreatorForm mode="create" />
    </div>
  );
}
