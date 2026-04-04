import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Branded Content Policy — BB Post',
};

export default function BrandedContentPolicyPage() {
  return (
    <main className="min-h-screen bg-[#0E0E0E] text-white px-6 py-20">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-[#8B5CF6] hover:underline text-sm mb-8 inline-block">
          ← Back to BB Post
        </Link>
        <h1 className="text-4xl font-bold mb-4">Branded Content Policy</h1>
        <p className="text-white/60 mb-8">TikTok API Compliance — April 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-white/80 leading-relaxed">
          <p>
            This page describes BB Post&apos;s Branded Content Policy as required by the TikTok API
            Terms of Service.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8">What is Branded Content?</h2>
          <p>
            Branded content on TikTok refers to content that promotes a brand, product, or service
            in exchange for payment or other incentive. TikTok requires creators to disclose branded
            content using TikTok&apos;s built-in disclosure tools.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8">BB Post and Branded Content</h2>
          <p>
            BB Post is a scheduling tool that publishes content on behalf of users. BB Post does not
            create sponsored content or act as an advertising intermediary. Users who schedule
            branded content through BB Post are responsible for:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Complying with TikTok&apos;s Branded Content Policy.</li>
            <li>Using TikTok&apos;s branded content disclosure toggle where required.</li>
            <li>Disclosing paid partnerships and sponsored content as required by law.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-8">TikTok Branded Content Resources</h2>
          <p>
            For TikTok&apos;s official branded content requirements, refer to{' '}
            <a
              href="https://www.tiktok.com/legal/page/global/bc-policy/en"
              className="text-[#8B5CF6] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              TikTok&apos;s Branded Content Policy
            </a>
            .
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8">Contact</h2>
          <p>
            Questions about branded content compliance? Open a discussion on our{' '}
            <a
              href="https://github.com/BusinessBuilders/BB-Post/discussions"
              className="text-[#8B5CF6] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Discussions
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
