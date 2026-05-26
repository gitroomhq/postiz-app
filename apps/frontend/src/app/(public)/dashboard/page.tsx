import { Metadata } from 'next';

export const dynamic = 'force-static';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Dashboard — D3 Creator',
  description:
    'Live overview of every creator we grow at D3 — followers, engagement, and growth across Instagram, TikTok, Facebook, Douyin, and Xiaohongshu.',
};

const cardClass = 'p-[24px] bg-lamboCharcoal text-left';

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
        <p className="lambo-caption text-lamboGold mb-[12px]">
          Dashboard
        </p>
        <h1 className="text-[54px] md:text-[80px] text-white leading-[1.13] mb-[16px] font-lambo uppercase">
          Every creator. Every platform.
        </h1>
        <p className="text-[16px] md:text-[18px] leading-[1.56] text-[#c8c8c8] max-w-[640px]">
          A live roll-up of every account we manage. Numbers refresh as our scraper
          collects them.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px]">
        {summaryStats.map((stat) => (
          <div key={stat.label} className={cardClass}>
            <div className="flex items-center justify-between mb-[16px]">
              <span className="lambo-micro text-[#9c9c9c]">
                {stat.label}
              </span>
              <span className="lambo-badge">Soon</span>
            </div>
            <div className="text-[40px] text-white leading-[1.15] mb-[8px] font-lambo uppercase">
              —
            </div>
            <p className="text-[12px] text-[#9c9c9c] leading-[1.5]">{stat.note}</p>
          </div>
        ))}
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

      <div className={cardClass}>
        <div className="flex items-center justify-between mb-[16px]">
          <h4 className="text-[20px] text-white font-lambo uppercase">Tracked Creators</h4>
          <span className="lambo-badge">Soon</span>
        </div>
        <div className="bg-lamboBlack p-[32px] text-center">
          <p className="text-[14px] text-[#696868]">
            Creator list appears once admin adds profiles.
          </p>
        </div>
      </div>
    </div>
  );
}
