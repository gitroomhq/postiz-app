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
  'px-[14px] py-[8px] rounded-full bg-[#1A1919] border border-[#252525] text-[13px] text-[#c8c8c8]';

const statCardClass =
  'p-[24px] rounded-[12px] bg-[#1A1919] border border-[#252525] text-left';

const placeholderBadge =
  'inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-full bg-[#1D4ED8]/15 text-[#60A5FA] text-[11px] font-semibold uppercase tracking-[1px]';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center text-center pt-[24px] md:pt-[48px]">
      <p className="text-[13px] uppercase tracking-[2px] text-[#1D4ED8] font-semibold mb-[16px]">
        Live Creator Showcase
      </p>
      <h1 className="text-[40px] md:text-[56px] font-bold text-white leading-[1.1] tracking-tight max-w-[760px] mb-[20px]">
        Real creators.{' '}
        <span className="text-[#1D4ED8]">Real numbers.</span>{' '}
        Live.
      </h1>
      <p className="text-[16px] md:text-[18px] leading-[1.6] text-[#c8c8c8] max-w-[640px] mb-[32px]">
        A public window into the creators we grow at D3. Follower counts, engagement,
        and growth — updated live across every platform we run.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-[12px] mb-[48px]">
        <Link
          href="/dashboard"
          className="px-[24px] py-[14px] rounded-[10px] bg-[#1D4ED8] hover:bg-[#1842b8] transition-colors text-white text-[15px] font-semibold"
        >
          View Dashboard
        </Link>
        <Link
          href="/leaderboard"
          className="px-[24px] py-[14px] rounded-[10px] bg-[#1A1919] hover:bg-[#252525] border border-[#252525] transition-colors text-white text-[15px] font-semibold"
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
            <span className="text-[13px] text-[#9c9c9c] uppercase tracking-[1px]">
              Total Followers
            </span>
            <span className={placeholderBadge}>Soon</span>
          </div>
          <div className="text-[32px] font-bold text-white leading-none mb-[8px]">
            —
          </div>
          <p className="text-[13px] text-[#9c9c9c] leading-[1.5]">
            Combined reach across every creator we track. Tracking starts soon.
          </p>
        </div>

        <div className={statCardClass}>
          <div className="flex items-center justify-between mb-[16px]">
            <span className="text-[13px] text-[#9c9c9c] uppercase tracking-[1px]">
              Active Creators
            </span>
            <span className={placeholderBadge}>Soon</span>
          </div>
          <div className="text-[32px] font-bold text-white leading-none mb-[8px]">
            —
          </div>
          <p className="text-[13px] text-[#9c9c9c] leading-[1.5]">
            Creators currently growing with D3. Tracking starts soon.
          </p>
        </div>

        <div className={statCardClass}>
          <div className="flex items-center justify-between mb-[16px]">
            <span className="text-[13px] text-[#9c9c9c] uppercase tracking-[1px]">
              30-Day Growth
            </span>
            <span className={placeholderBadge}>Soon</span>
          </div>
          <div className="text-[32px] font-bold text-white leading-none mb-[8px]">
            —
          </div>
          <p className="text-[13px] text-[#9c9c9c] leading-[1.5]">
            New followers added in the last 30 days. Tracking starts soon.
          </p>
        </div>
      </div>

      <p className="text-[13px] text-[#696868] mt-[48px] max-w-[480px] leading-[1.6]">
        Numbers go live the moment our scraper kicks in. Until then, this page stands
        ready.
      </p>
    </div>
  );
}
