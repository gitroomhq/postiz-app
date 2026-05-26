import { Metadata } from 'next';
import Link from 'next/link';
import { CreatorRowActions } from './creators/creator-row-actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin — D3 Creator',
  description: '',
};

const cardClass =
  'p-[24px] bg-lamboCharcoal';

const placeholderBadge =
  'inline-flex items-center gap-[6px] px-[8px] py-[4px] bg-lamboIron text-lamboAsh text-[10px] uppercase tracking-[0.225px]';

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
          <p className="text-[10px] uppercase tracking-[0.225px] text-lamboGold mb-[12px]">
            Tracked Creators
          </p>
          <h1 className="text-[40px] md:text-[54px] text-white leading-[1.19] tracking-tight mb-[8px] uppercase">
            Manage creator profiles
          </h1>
          <p className="text-[16px] text-lamboAsh leading-[1.5] max-w-[640px]">
            Add the URLs of creator profiles you want to track. The scraper
            picks them up automatically and they appear on the public
            showcase.
          </p>
        </div>
        <Link
          href="/admin/creators/new"
          className="px-[24px] py-[12px] bg-lamboGold hover:bg-[#917300] transition-colors text-black text-[14px] uppercase tracking-[0.14px] whitespace-nowrap"
        >
          + Add creator
        </Link>
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between mb-[16px]">
          <h2 className="text-[24px] text-white uppercase tracking-tight">
            All creators
          </h2>
          <span className={placeholderBadge}>Mock data</span>
        </div>

        <div className="overflow-hidden">
          <div className="grid grid-cols-[1fr_2fr_160px] gap-[12px] px-[16px] py-[12px] bg-lamboIron text-[10px] uppercase tracking-[0.225px] text-lamboAsh">
            <div>Creator</div>
            <div>Platforms</div>
            <div className="text-right">Actions</div>
          </div>
          {mockCreators.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[1fr_2fr_160px] gap-[12px] px-[16px] py-[14px] border-t border-[#202020] items-center"
            >
              <div className="flex items-center gap-[12px]">
                <div className="w-[32px] h-[32px] rounded-full bg-black border border-[#202020]" />
                <span className="text-[14px] text-white uppercase tracking-[0.14px]">
                  {c.name}
                </span>
              </div>
              <div className="flex flex-wrap gap-[6px]">
                {c.platforms.map((p) => (
                  <span
                    key={p}
                    className="px-[8px] py-[3px] bg-lamboIron text-[10px] uppercase tracking-[0.225px] text-lamboAsh"
                  >
                    {p}
                  </span>
                ))}
              </div>
              <CreatorRowActions id={c.id} name={c.name} />
            </div>
          ))}
        </div>

        <p className="text-[10px] text-lamboAsh mt-[12px] uppercase tracking-[0.225px]">
          Live data lands once the scraper backend ships. Until then this list
          is a fixed mock.
        </p>
      </div>
    </div>
  );
}
