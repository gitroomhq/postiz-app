import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Params = { id: string; platform: string };

const VALID_PLATFORMS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  douyin: 'Douyin',
  xiaohongshu: 'Xiaohongshu',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id, platform } = await params;
  const platformLabel = VALID_PLATFORMS[platform.toLowerCase()] ?? platform;
  return {
    title: `${id} on ${platformLabel} — D3 Creator`,
    description: `Live ${platformLabel} stats for creator ${id} — followers, engagement, and growth.`,
  };
}

const cardClass =
  'p-[24px] rounded-[12px] bg-[#1A1919] border border-[#252525]';

const placeholderBadge =
  'inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-full bg-[#1D4ED8]/15 text-[#60A5FA] text-[11px] font-semibold uppercase tracking-[1px]';

export default async function CreatorPlatformPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id, platform } = await params;
  const platformKey = platform.toLowerCase();
  const platformLabel = VALID_PLATFORMS[platformKey];

  if (!platformLabel) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-[32px]">
      <div>
        <Link
          href={`/creators/${encodeURIComponent(id)}`}
          className="text-[13px] text-[#9c9c9c] hover:text-white transition-colors mb-[12px] inline-block"
        >
          ← Back to {id}
        </Link>
        <p className="text-[13px] uppercase tracking-[2px] text-[#1D4ED8] font-semibold mb-[8px]">
          {platformLabel}
        </p>
        <h1 className="text-[28px] md:text-[36px] font-bold text-white leading-[1.1] tracking-tight">
          {id} on {platformLabel}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px]">
        {['Followers', 'Following', 'Posts', 'Engagement Rate'].map((label) => (
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
        <div className="flex items-center justify-between mb-[16px]">
          <h2 className="text-[18px] font-semibold text-white">
            Follower Growth — Last 30 Days
          </h2>
          <span className={placeholderBadge}>Soon</span>
        </div>
        <div className="h-[240px] rounded-[8px] bg-[#0E0E0E] border border-dashed border-[#252525] flex items-center justify-center">
          <p className="text-[14px] text-[#696868]">
            Chart appears once tracking starts.
          </p>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between mb-[16px]">
          <h2 className="text-[18px] font-semibold text-white">Recent Posts</h2>
          <span className={placeholderBadge}>Soon</span>
        </div>
        <div className="rounded-[8px] bg-[#0E0E0E] border border-dashed border-[#252525] p-[32px] text-center">
          <p className="text-[14px] text-[#696868]">
            Posts appear once scraper indexes this account.
          </p>
        </div>
      </div>
    </div>
  );
}
