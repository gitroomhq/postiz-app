import { Metadata } from 'next';

export const dynamic = 'force-static';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Leaderboard — D3 Creator',
  description:
    'Top creators we grow at D3, ranked by followers and 30-day growth across every platform.',
};

const cardClass =
  'p-[24px] rounded-[12px] bg-[#1A1919] border border-[#252525]';

const placeholderBadge =
  'inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-full bg-[#1D4ED8]/15 text-[#60A5FA] text-[11px] font-semibold uppercase tracking-[1px]';

const rankPlaceholders = [1, 2, 3, 4, 5];

export default function LeaderboardPage() {
  return (
    <div className="flex flex-col gap-[32px]">
      <div>
        <p className="text-[13px] uppercase tracking-[2px] text-[#1D4ED8] font-semibold mb-[12px]">
          Leaderboard
        </p>
        <h1 className="text-[32px] md:text-[40px] font-bold text-white leading-[1.1] tracking-tight mb-[12px]">
          Top creators, ranked live.
        </h1>
        <p className="text-[15px] md:text-[16px] leading-[1.6] text-[#c8c8c8] max-w-[640px]">
          Ranked by followers and 30-day growth across every platform we run.
          Updated as soon as our scraper kicks in.
        </p>
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between mb-[20px]">
          <h2 className="text-[18px] font-semibold text-white">By Total Followers</h2>
          <span className={placeholderBadge}>Soon</span>
        </div>

        <div className="rounded-[8px] overflow-hidden border border-[#252525]">
          <div className="grid grid-cols-[48px_1fr_120px_120px] gap-[12px] px-[16px] py-[12px] bg-[#0E0E0E] text-[12px] uppercase tracking-[1px] text-[#9c9c9c]">
            <div>#</div>
            <div>Creator</div>
            <div className="text-right">Followers</div>
            <div className="text-right">30d Δ</div>
          </div>
          {rankPlaceholders.map((rank) => (
            <div
              key={rank}
              className="grid grid-cols-[48px_1fr_120px_120px] gap-[12px] px-[16px] py-[14px] border-t border-[#252525] items-center"
            >
              <div className="text-[14px] text-[#696868] font-semibold">
                {rank}
              </div>
              <div className="flex items-center gap-[12px]">
                <div className="w-[32px] h-[32px] rounded-full bg-[#0E0E0E] border border-dashed border-[#252525]" />
                <span className="text-[14px] text-[#696868]">
                  Tracking starts soon
                </span>
              </div>
              <div className="text-right text-[14px] text-[#696868]">—</div>
              <div className="text-right text-[14px] text-[#696868]">—</div>
            </div>
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between mb-[20px]">
          <h2 className="text-[18px] font-semibold text-white">By 30-Day Growth</h2>
          <span className={placeholderBadge}>Soon</span>
        </div>
        <div className="rounded-[8px] bg-[#0E0E0E] border border-dashed border-[#252525] p-[32px] text-center">
          <p className="text-[14px] text-[#696868]">
            Growth leaderboard appears once 30 days of data exists.
          </p>
        </div>
      </div>
    </div>
  );
}
