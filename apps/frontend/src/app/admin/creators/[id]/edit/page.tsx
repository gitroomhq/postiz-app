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
    <div className="flex flex-col gap-10 max-w-[680px] pt-12 pb-24">
      <header>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-caption text-fgMuted hover:text-fg transition-colors mb-6"
        >
          ← Back to creators
        </Link>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted mb-4">
          Edit creator
        </span>
        <h1 className="text-display-2 text-fg mb-4">{initial.name}</h1>
        <p className="text-body-lg text-fgMuted">
          Update their display name, slug, or platform URLs. Changes go live on
          the public showcase as soon as the scraper picks them up.
        </p>
      </header>

      <CreatorForm mode="edit" initial={initial} />
    </div>
  );
}
