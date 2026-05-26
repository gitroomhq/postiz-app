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
          className="text-[12px] text-lamboAsh hover:text-white transition-colors mb-[12px] inline-block uppercase tracking-[0.14px]"
        >
          ← Back to creators
        </Link>
        <p className="text-[10px] uppercase tracking-[0.225px] text-lamboGold mb-[8px]">
          Edit creator
        </p>
        <h1 className="text-[40px] md:text-[54px] text-white leading-[1.19] tracking-tight mb-[8px] uppercase">
          {initial.name}
        </h1>
        <p className="text-[16px] text-lamboAsh leading-[1.5]">
          Update their display name, slug, or platform URLs. Changes go live
          on the public showcase as soon as the scraper picks them up.
        </p>
      </div>

      <CreatorForm mode="edit" initial={initial} />
    </div>
  );
}
