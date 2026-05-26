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

const cardClass = 'p-[24px] bg-lamboCharcoal';

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
          className="lambo-micro text-lamboAsh hover:text-white transition-colors mb-[12px] inline-block"
        >
          ← Back to {id}
        </Link>
        <p className="lambo-caption text-lamboGold mb-[8px]">
          {platformLabel}
        </p>
        <h1 className="text-[40px] md:text-[54px] text-white leading-[1.19] font-lambo uppercase">
          {id} on {platformLabel}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px]">
        {['Followers', 'Following', 'Posts', 'Engagement Rate'].map((label) => (
          <div key={label} className={cardClass}>
            <div className="flex items-center justify-between mb-[12px]">
              <span className="lambo-micro text-[#9c9c9c]">
                {label}
              </span>
              <span className="lambo-badge">Soon</span>
            </div>
            <div className="text-[40px] text-white leading-[1.15] font-lambo uppercase">—</div>
          </div>
        ))}
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between mb-[16px]">
          <h4 className="text-[20px] text-white font-lambo uppercase">
            Follower Growth — Last 30 Days
          </h4>
          <span className="lambo-badge">Soon</span>
        </div>
        <div className="h-[240px] bg-lamboBlack flex items-center justify-center">
          <p className="text-[14px] text-lamboAsh">
            Chart appears once tracking starts.
          </p>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between mb-[16px]">
          <h4 className="text-[20px] text-white font-lambo uppercase">Recent Posts</h4>
          <span className="lambo-badge">Soon</span>
        </div>
        <div className="bg-lamboBlack p-[32px] text-center">
          <p className="text-[14px] text-lamboAsh">
            Posts appear once scraper indexes this account.
          </p>
        </div>
      </div>
    </div>
  );
}
