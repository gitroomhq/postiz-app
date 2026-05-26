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
          className="text-[12px] text-lamboAsh hover:text-white transition-colors mb-[12px] inline-block uppercase tracking-[0.14px]"
        >
          ← Back to creators
        </Link>
        <p className="text-[10px] uppercase tracking-[0.225px] text-lamboGold mb-[8px]">
          New creator
        </p>
        <h1 className="text-[40px] md:text-[54px] text-white leading-[1.19] tracking-tight mb-[8px] uppercase">
          Add a creator
        </h1>
        <p className="text-[16px] text-lamboAsh leading-[1.5]">
          Give them a display name, pick a URL slug, and paste in their
          platform URLs. They show up on the public showcase as soon as the
          scraper indexes them.
        </p>
      </div>

      <CreatorForm mode="create" />
    </div>
  );
}
