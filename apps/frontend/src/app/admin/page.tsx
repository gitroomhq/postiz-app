import { Metadata } from 'next';
import Link from 'next/link';
import { CreatorRowActions } from './creators/creator-row-actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin — D3 Creator',
  description: '',
};

const cardClass =
  'p-[24px] rounded-[12px] bg-[#1A1919] border border-[#252525]';

const placeholderBadge =
  'inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-full bg-[#1D4ED8]/15 text-[#60A5FA] text-[11px] font-semibold uppercase tracking-[1px]';

// Mock data — replaced with a real query once the scraper backend lands.
// Until then the admin can see the shape of the UI and confirm forms work.
const mockCreators: Array<{
  id: string;
  name: string;
  platforms: string[];
}> = [
  {
    id: 'demo-creator',
    name: 'Demo Creator',
    platforms: ['Instagram', 'TikTok', 'Xiaohongshu'],
  },
];

export default function AdminHomePage() {
  return (
    <div className="flex flex-col gap-[32px]">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-[16px]">
        <div>
          <p className="text-[13px] uppercase tracking-[2px] text-[#1D4ED8] font-semibold mb-[12px]">
            Tracked Creators
          </p>
          <h1 className="text-[28px] md:text-[36px] font-bold text-white leading-[1.1] tracking-tight mb-[8px]">
            Manage creator profiles
          </h1>
          <p className="text-[14px] text-[#c8c8c8] leading-[1.6] max-w-[640px]">
            Add the URLs of creator profiles you want to track. The scraper
            picks them up automatically and they appear on the public
            showcase.
          </p>
        </div>
        <Link
          href="/admin/creators/new"
          className="px-[20px] py-[12px] rounded-[10px] bg-[#1D4ED8] hover:bg-[#1842b8] transition-colors text-white text-[14px] font-semibold whitespace-nowrap"
        >
          + Add creator
        </Link>
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between mb-[16px]">
          <h2 className="text-[18px] font-semibold text-white">
            All creators
          </h2>
          <span className={placeholderBadge}>Mock data</span>
        </div>

        <div className="rounded-[8px] overflow-hidden border border-[#252525]">
          <div className="grid grid-cols-[1fr_2fr_160px] gap-[12px] px-[16px] py-[12px] bg-[#0E0E0E] text-[12px] uppercase tracking-[1px] text-[#9c9c9c]">
            <div>Creator</div>
            <div>Platforms</div>
            <div className="text-right">Actions</div>
          </div>
          {mockCreators.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[1fr_2fr_160px] gap-[12px] px-[16px] py-[14px] border-t border-[#252525] items-center"
            >
              <div className="flex items-center gap-[12px]">
                <div className="w-[32px] h-[32px] rounded-full bg-[#0E0E0E] border border-dashed border-[#252525]" />
                <span className="text-[14px] text-white font-semibold">
                  {c.name}
                </span>
              </div>
              <div className="flex flex-wrap gap-[6px]">
                {c.platforms.map((p) => (
                  <span
                    key={p}
                    className="px-[8px] py-[3px] rounded-full bg-[#0E0E0E] border border-[#252525] text-[11px] text-[#c8c8c8]"
                  >
                    {p}
                  </span>
                ))}
              </div>
              <CreatorRowActions id={c.id} name={c.name} />
            </div>
          ))}
        </div>

        <p className="text-[12px] text-[#696868] mt-[12px]">
          Live data lands once the scraper backend ships. Until then this list
          is a fixed mock.
        </p>
      </div>
    </div>
  );
}
