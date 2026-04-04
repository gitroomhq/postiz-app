import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Music Usage Confirmation — BB Post',
};

export default function MusicUsageConfirmationPage() {
  return (
    <main className="min-h-screen bg-[#0E0E0E] text-white px-6 py-20">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-[#8B5CF6] hover:underline text-sm mb-8 inline-block">
          ← Back to BB Post
        </Link>
        <h1 className="text-4xl font-bold mb-4">Music Usage Confirmation</h1>
        <p className="text-white/60 mb-8">TikTok API Compliance — April 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-white/80 leading-relaxed">
          <p>
            This page describes BB Post&apos;s compliance with TikTok&apos;s music usage policies
            as required by the TikTok API Terms of Service.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8">Music in TikTok Content</h2>
          <p>
            BB Post does not add, modify, or provide music to TikTok content. BB Post is a
            scheduling and management tool — users upload their own video content through the TikTok
            interface or provide video files directly. Any music included in videos is the
            responsibility of the content creator.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8">User Responsibility</h2>
          <p>
            By scheduling TikTok content through BB Post, you confirm that:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>You have the rights or license to use any music in your content.</li>
            <li>Your content complies with TikTok&apos;s Music Usage Policy.</li>
            <li>You have obtained any necessary permissions for music used in your videos.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-8">TikTok Music Resources</h2>
          <p>
            For information about TikTok&apos;s music licensing and usage rules, refer to
            TikTok&apos;s official policies at{' '}
            <a
              href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
              className="text-[#8B5CF6] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              TikTok Music Usage Confirmation
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
