import { Metadata } from 'next';
import Link from 'next/link';
import { CreatorForm, CreatorFormValues } from '../../creator-form';

export const dynamic = 'force-dynamic';

type Params = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Edit ${id} — D3 Creator Admin`,
    description: '',
  };
}

// Mock prefill so the edit form has something to render. Replaced with a
// real fetch once the scraper backend lands.
function mockPrefill(id: string): CreatorFormValues {
  return {
    name: 'Demo Creator',
    slug: id,
    urls: {
      instagram: 'https://instagram.com/demo',
      facebook: '',
      tiktok: 'https://tiktok.com/@demo',
      douyin: '',
      xiaohongshu: 'https://www.xiaohongshu.com/user/profile/demo',
    },
  };
}

export default async function EditCreatorPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const initial = mockPrefill(id);

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
          Edit creator
        </p>
        <h1 className="text-[28px] md:text-[36px] font-bold text-white leading-[1.1] tracking-tight mb-[8px]">
          {initial.name}
        </h1>
        <p className="text-[14px] text-[#c8c8c8] leading-[1.6]">
          Update their display name, slug, or platform URLs. Changes go live
          on the public showcase as soon as the scraper picks them up.
        </p>
      </div>

      <CreatorForm mode="edit" initial={initial} />
    </div>
  );
}
