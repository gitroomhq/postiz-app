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

const cardClass =
  'p-[24px] rounded-[12px] bg-[#1A1919] border border-[#252525]';

const placeholderBadge =
  'inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-full bg-[#1D4ED8]/15 text-[#60A5FA] text-[11px] font-semibold uppercase tracking-[1px]';

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
          <div className="w-[64px] h-[64px] rounded-full bg-[#0E0E0E] border border-dashed border-[#252525]" />
          <div>
            <p className="text-[13px] uppercase tracking-[2px] text-[#1D4ED8] font-semibold mb-[4px]">
              Creator Profile
            </p>
            <h1 className="text-[28px] md:text-[36px] font-bold text-white leading-[1.1] tracking-tight">
              {id}
            </h1>
          </div>
        </div>
        {admin && (
          <Link
            href={`/admin/creators/${encodeURIComponent(id)}/edit`}
            data-admin-only="true"
            className="px-[14px] py-[8px] rounded-[8px] bg-[#1A1919] border border-[#252525] hover:border-[#1D4ED8]/40 text-[12px] text-[#c8c8c8] font-semibold uppercase tracking-[1px] transition-colors whitespace-nowrap"
          >
            Edit creator
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
        {['Total Followers', 'Total Engagement', '30-Day Growth'].map((label) => (
          <div key={label} className={cardClass}>
            <div className="flex items-center justify-between mb-[12px]">
              <span className="text-[12px] text-[#9c9c9c] uppercase tracking-[1px]">
                {label}
              </span>
              <span className={placeholderBadge}>Soon</span>
            </div>
            <div className="text-[28px] font-bold text-white leading-none">—</div>
          </div>
        ))}
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between mb-[20px]">
          <h2 className="text-[18px] font-semibold text-white">Platforms</h2>
          <span className={placeholderBadge}>Soon</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[12px]">
          {platforms.map((p) => (
            <Link
              key={p.slug}
              href={`/creators/${encodeURIComponent(id)}/${p.slug}`}
              className="flex items-center justify-between p-[16px] rounded-[10px] bg-[#0E0E0E] border border-[#252525] hover:border-[#1D4ED8]/40 transition-colors"
            >
              <span className="text-[14px] text-white font-semibold">
                {p.label}
              </span>
              <span className="text-[12px] text-[#696868]">View →</span>
            </Link>
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between mb-[16px]">
          <h2 className="text-[18px] font-semibold text-white">Growth — Last 30 Days</h2>
          <span className={placeholderBadge}>Soon</span>
        </div>
        <div className="h-[240px] rounded-[8px] bg-[#0E0E0E] border border-dashed border-[#252525] flex items-center justify-center">
          <p className="text-[14px] text-[#696868]">
            Chart appears once tracking starts.
          </p>
        </div>
      </div>
    </div>
  );
}
