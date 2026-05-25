import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'D3 Analytics — All your social analytics in one place',
  description:
    'D3 Analytics is a self-serve social media analytics platform. Connect Instagram, Facebook, TikTok, Douyin, and Xiaohongshu (RedNote) accounts and see your analytics in a single dashboard.',
};

const platformPill =
  'px-[14px] py-[8px] rounded-full bg-[#1A1919] border border-[#252525] text-[13px] text-[#c8c8c8]';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center text-center pt-[24px] md:pt-[48px]">
      <p className="text-[13px] uppercase tracking-[2px] text-[#1D4ED8] font-semibold mb-[16px]">
        Social Media Analytics
      </p>
      <h1 className="text-[40px] md:text-[56px] font-bold text-white leading-[1.1] tracking-tight max-w-[760px] mb-[20px]">
        All your social analytics{' '}
        <span className="text-[#1D4ED8]">in one place</span>
      </h1>
      <p className="text-[16px] md:text-[18px] leading-[1.6] text-[#c8c8c8] max-w-[640px] mb-[32px]">
        Connect Instagram, Facebook, TikTok, Douyin, and Xiaohongshu, then watch your
        followers, engagement, and growth all from a single dashboard.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-[12px] mb-[48px]">
        <Link
          href="/auth"
          className="px-[24px] py-[14px] rounded-[10px] bg-[#1D4ED8] hover:bg-[#1842b8] transition-colors text-white text-[15px] font-semibold"
        >
          Get started — it&rsquo;s free
        </Link>
        <Link
          href="/auth/login"
          className="px-[24px] py-[14px] rounded-[10px] bg-[#1A1919] hover:bg-[#252525] border border-[#252525] transition-colors text-white text-[15px] font-semibold"
        >
          Log in
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
        <div className="p-[24px] rounded-[12px] bg-[#1A1919] border border-[#252525] text-left">
          <div className="w-[40px] h-[40px] rounded-[10px] bg-[#1D4ED8]/15 flex items-center justify-center mb-[16px]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 3v18h18" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" />
              <path d="M7 14l4-4 3 3 5-6" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-[16px] font-semibold text-white mb-[8px]">Track growth daily</h3>
          <p className="text-[14px] text-[#9c9c9c] leading-[1.6]">
            Daily snapshots of followers, views, and engagement, with charts for the last 30
            days and 12 months.
          </p>
        </div>
        <div className="p-[24px] rounded-[12px] bg-[#1A1919] border border-[#252525] text-left">
          <div className="w-[40px] h-[40px] rounded-[10px] bg-[#1D4ED8]/15 flex items-center justify-center mb-[16px]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#1D4ED8" strokeWidth="2" />
              <path d="M12 7v5l3 3" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="text-[16px] font-semibold text-white mb-[8px]">Multiple accounts</h3>
          <p className="text-[14px] text-[#9c9c9c] leading-[1.6]">
            Connect as many accounts as you like per platform. See everything together or
            drill into one at a time.
          </p>
        </div>
        <div className="p-[24px] rounded-[12px] bg-[#1A1919] border border-[#252525] text-left">
          <div className="w-[40px] h-[40px] rounded-[10px] bg-[#1D4ED8]/15 flex items-center justify-center mb-[16px]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4z" stroke="#1D4ED8" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-[16px] font-semibold text-white mb-[8px]">Yours, securely</h3>
          <p className="text-[14px] text-[#9c9c9c] leading-[1.6]">
            Encrypted in transit and at rest. Disconnect or delete your data any time
            &mdash; see our{' '}
            <Link href="/privacy" className="text-[#1D4ED8] hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
