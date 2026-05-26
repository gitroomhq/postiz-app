import { Metadata } from 'next';
import Link from 'next/link';
import { isAdmin } from '../../../admin/is-admin';

export const dynamic = 'force-dynamic';

type Params = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Creator ${id} — D3 Creator`,
    description: `Live follower counts, engagement, and growth for creator ${id} across every platform.`,
  };
}

const cardClass = 'p-[24px] bg-lamboCharcoal';

const platforms = [
  { slug: 'instagram', label: 'Instagram' },
  { slug: 'facebook', label: 'Facebook' },
  { slug: 'tiktok', label: 'TikTok' },
  { slug: 'douyin', label: 'Douyin' },
  { slug: 'xiaohongshu', label: 'Xiaohongshu' },
];

export default async function CreatorPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const admin = await isAdmin();

  return (
    <div className="flex flex-col gap-[32px]">
      <div className="flex items-start justify-between gap-[16px]">
        <div className="flex items-center gap-[16px]">
          <div className="w-[64px] h-[64px] bg-lamboCharcoal" />
          <div>
            <p className="lambo-caption text-lamboGold mb-[8px]">
              Creator Profile
            </p>
            <h1 className="text-[54px] md:text-[80px] text-white leading-[1.13] font-lambo uppercase">
              {id}
            </h1>
          </div>
        </div>
        {admin && (
          <Link
            href={`/admin/creators/${encodeURIComponent(id)}/edit`}
            data-admin-only="true"
            className="lambo-micro px-[14px] py-[8px] bg-lamboCharcoal text-[#c8c8c8] hover:text-lamboGold transition-colors whitespace-nowrap"
          >
            Edit creator
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
        {['Total Followers', 'Total Engagement', '30-Day Growth'].map((label) => (
          <div key={label} className={cardClass}>
            <div className="flex items-center justify-between mb-[12px]">
              <span className="lambo-micro text-[#9c9c9c]">
                {label}
              </span>
              <span className="lambo-badge">Soon</span>
            </div>
            <div className="text-[40px] text-white leading-[1.15] font-lambo uppercase text-lamboGold">—</div>
          </div>
        ))}
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between mb-[20px]">
          <h4 className="text-[20px] text-white font-lambo uppercase">Platforms</h4>
          <span className="lambo-badge">Soon</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[12px]">
          {platforms.map((p) => (
            <Link
              key={p.slug}
              href={`/creators/${encodeURIComponent(id)}/${p.slug}`}
              className="flex items-center justify-between p-[16px] bg-lamboBlack hover:bg-lamboIron transition-colors"
            >
              <span className="lambo-micro text-white">
                {p.label}
              </span>
              <span className="text-[12px] text-lamboAsh">View →</span>
            </Link>
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between mb-[16px]">
          <h4 className="text-[20px] text-white font-lambo uppercase">Growth — Last 30 Days</h4>
          <span className="lambo-badge">Soon</span>
        </div>
        <div className="h-[240px] bg-lamboBlack flex items-center justify-center">
          <p className="text-[14px] text-lamboAsh">
            Chart appears once tracking starts.
          </p>
        </div>
      </div>
    </div>
  );
}
