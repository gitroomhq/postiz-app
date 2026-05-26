import { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-static';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'D3 Creator — Real creators. Real numbers. Live.',
  description:
    'D3 Creator is a live public showcase of the creators we grow. Real follower counts, real engagement, real growth — across Instagram, TikTok, Facebook, Douyin, and Xiaohongshu (RedNote).',
};

const platformPill =
  'px-[14px] py-[8px] bg-lamboCharcoal text-[13px] text-[#c8c8c8] uppercase tracking-[0.14px]';

const statCardClass =
  'p-[24px] bg-lamboCharcoal text-left';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center text-center pt-[24px] md:pt-[48px]">
      <p className="lambo-caption text-lamboGold mb-[16px]">
        Live Creator Showcase
      </p>
      <h1 className="lambo-hero text-white max-w-[1100px] mb-[24px]">
        Real creators.{' '}
        <span className="text-lamboGold">Real numbers.</span>{' '}
        Live.
      </h1>
      <p className="text-[16px] md:text-[18px] leading-[1.56] text-[#c8c8c8] max-w-[640px] mb-[32px]">
        A public window into the creators we grow at D3. Follower counts, engagement,
        and growth — updated live across every platform we run.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-[12px] mb-[48px]">
        <Link
          href="/dashboard"
          className="px-[24px] py-[14px] bg-forth hover:bg-lamboGoldDark transition-colors text-black text-[16px] uppercase tracking-[0.14px]"
        >
          View Dashboard
        </Link>
        <Link
          href="/leaderboard"
          className="px-[16px] py-[14px] bg-transparent opacity-50 hover:opacity-70 hover:bg-lamboTeal/70 border border-white/50 transition-all text-white text-[14.4px] uppercase tracking-[0.2px]"
        >
          View Leaderboard
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-[10px] mb-[64px]">
        <span className={platformPill}>Instagram</span>
        <span className={platformPill}>Facebook</span>
        <span className={platformPill}>TikTok</span>
        <span className={platformPill}>Douyin</span>
        <span className={platformPill}>Xiaohongshu</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[20px] w-full mt-[24px]">
        <div className={statCardClass}>
          <div className="flex items-center justify-between mb-[16px]">
            <span className="lambo-micro text-[#9c9c9c]">
              Total Followers
            </span>
            <span className="lambo-badge">Soon</span>
          </div>
          <div className="text-[40px] text-white leading-[1.15] mb-[8px] font-lambo uppercase">
            —
          </div>
          <p className="text-[13px] text-[#9c9c9c] leading-[1.5]">
            Combined reach across every creator we track. Tracking starts soon.
          </p>
        </div>

        <div className={statCardClass}>
          <div className="flex items-center justify-between mb-[16px]">
            <span className="lambo-micro text-[#9c9c9c]">
              Active Creators
            </span>
            <span className="lambo-badge">Soon</span>
          </div>
          <div className="text-[40px] text-white leading-[1.15] mb-[8px] font-lambo uppercase">
            —
          </div>
          <p className="text-[13px] text-[#9c9c9c] leading-[1.5]">
            Creators currently growing with D3. Tracking starts soon.
          </p>
        </div>

        <div className={statCardClass}>
          <div className="flex items-center justify-between mb-[16px]">
            <span className="lambo-micro text-[#9c9c9c]">
              30-Day Growth
            </span>
            <span className="lambo-badge">Soon</span>
          </div>
          <div className="text-[40px] text-white leading-[1.15] mb-[8px] font-lambo uppercase">
            —
          </div>
          <p className="text-[13px] text-[#9c9c9c] leading-[1.5]">
            New followers added in the last 30 days. Tracking starts soon.
          </p>
        </div>
      </div>

      <p className="lambo-micro text-[#696868] mt-[48px] max-w-[480px] leading-[2]">
        Numbers go live the moment our scraper kicks in. Until then, this page stands ready.
      </p>
    </div>
  );
}
