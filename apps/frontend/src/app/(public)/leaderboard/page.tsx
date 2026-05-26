import { Metadata } from 'next';

export const dynamic = 'force-static';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Leaderboard — D3 Creator',
  description:
    'Top creators we grow at D3, ranked by followers and 30-day growth across every platform.',
};

const cardClass = 'p-[24px] bg-lamboCharcoal';

const rankPlaceholders = [1, 2, 3, 4, 5];

export default function LeaderboardPage() {
  return (
    <div className="flex flex-col gap-[32px]">
      <div>
        <p className="lambo-caption text-lamboGold mb-[12px]">
          Leaderboard
        </p>
        <h1 className="text-[54px] md:text-[80px] text-white leading-[1.13] mb-[16px] font-lambo uppercase">
          Top creators, ranked live.
        </h1>
        <p className="text-[16px] md:text-[18px] leading-[1.56] text-[#c8c8c8] max-w-[640px]">
          Ranked by followers and 30-day growth across every platform we run.
          Updated as soon as our scraper kicks in.
        </p>
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between mb-[20px]">
          <h4 className="text-[20px] text-white font-lambo uppercase">By Total Followers</h4>
          <span className="lambo-badge">Soon</span>
        </div>

        <div className="overflow-hidden">
          <div className="grid grid-cols-[48px_1fr_120px_120px] gap-[12px] px-[16px] py-[12px] bg-lamboBlack lambo-micro text-lamboAsh">
            <div>#</div>
            <div>Creator</div>
            <div className="text-right">Followers</div>
            <div className="text-right">30d Δ</div>
          </div>
          {rankPlaceholders.map((rank) => (
            <div
              key={rank}
              className="grid grid-cols-[48px_1fr_120px_120px] gap-[12px] px-[16px] py-[14px] border-t border-lamboIron items-center"
            >
              <div className="text-[14px] text-lamboAsh">
                {rank}
              </div>
              <div className="flex items-center gap-[12px]">
                <div className="w-[32px] h-[32px] bg-lamboBlack" />
                <span className="text-[14px] text-lamboAsh">
                  Tracking starts soon
                </span>
              </div>
              <div className="text-right text-[14px] text-lamboAsh">—</div>
              <div className="text-right text-[14px] text-lamboAsh">—</div>
            </div>
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between mb-[20px]">
          <h4 className="text-[20px] text-white font-lambo uppercase">By 30-Day Growth</h4>
          <span className="lambo-badge">Soon</span>
        </div>
        <div className="bg-lamboBlack p-[32px] text-center">
          <p className="text-[14px] text-lamboAsh">
            Growth leaderboard appears once 30 days of data exists.
          </p>
        </div>
      </div>
    </div>
  );
}
