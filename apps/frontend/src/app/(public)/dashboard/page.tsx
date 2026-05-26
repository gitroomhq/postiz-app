import { Metadata } from 'next';

export const dynamic = 'force-static';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Dashboard — D3 Creator',
  description:
    'Live overview of every creator we grow at D3 — followers, engagement, and growth across Instagram, TikTok, Facebook, Douyin, and Xiaohongshu.',
};

const cardClass =
  'p-[24px] rounded-[12px] bg-[#1A1919] border border-[#252525] text-left';

const placeholderBadge =
  'inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-full bg-[#1D4ED8]/15 text-[#60A5FA] text-[11px] font-semibold uppercase tracking-[1px]';

const summaryStats = [
  {
    label: 'Total Followers',
    note: 'Combined reach across every creator.',
  },
  {
    label: 'Total Engagement',
    note: 'Likes, comments, and shares — last 30 days.',
  },
  {
    label: 'Active Creators',
    note: 'Creators currently tracked.',
  },
  {
    label: '30-Day Growth',
    note: 'New followers added in the last 30 days.',
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-[32px]">
      <div>
        <p className="text-[13px] uppercase tracking-[2px] text-[#1D4ED8] font-semibold mb-[12px]">
          Dashboard
        </p>
        <h1 className="text-[32px] md:text-[40px] font-bold text-white leading-[1.1] tracking-tight mb-[12px]">
          Every creator. Every platform.
        </h1>
        <p className="text-[15px] md:text-[16px] leading-[1.6] text-[#c8c8c8] max-w-[640px]">
          A live roll-up of every account we manage. Numbers refresh as our scraper
          collects them.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px]">
        {summaryStats.map((stat) => (
          <div key={stat.label} className={cardClass}>
            <div className="flex items-center justify-between mb-[16px]">
              <span className="text-[12px] text-[#9c9c9c] uppercase tracking-[1px]">
                {stat.label}
              </span>
              <span className={placeholderBadge}>Soon</span>
            </div>
            <div className="text-[28px] font-bold text-white leading-none mb-[8px]">
              —
            </div>
            <p className="text-[12px] text-[#9c9c9c] leading-[1.5]">{stat.note}</p>
          </div>
        ))}
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

      <div className={cardClass}>
        <div className="flex items-center justify-between mb-[16px]">
          <h2 className="text-[18px] font-semibold text-white">Tracked Creators</h2>
          <span className={placeholderBadge}>Soon</span>
        </div>
        <div className="rounded-[8px] bg-[#0E0E0E] border border-dashed border-[#252525] p-[32px] text-center">
          <p className="text-[14px] text-[#696868]">
            Creator list appears once admin adds profiles.
          </p>
        </div>
      </div>
    </div>
  );
}
