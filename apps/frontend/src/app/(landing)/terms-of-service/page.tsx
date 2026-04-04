import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — BB Post',
};

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[#0E0E0E] text-white px-6 py-20">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-[#8B5CF6] hover:underline text-sm mb-8 inline-block">
          ← Back to BB Post
        </Link>
        <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-white/60 mb-8">Last updated: April 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-white/80 leading-relaxed">
          <p>
            By using BB Post you agree to these Terms of Service. BB Post is provided as-is under
            the AGPL v3 open-source license.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8">Acceptable Use</h2>
          <p>
            You may use BB Post to schedule and manage social media content for lawful purposes. You
            must not use BB Post to post spam, violate platform terms of service, or engage in
            deceptive practices.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8">Account Responsibility</h2>
          <p>
            You are responsible for maintaining the security of your account credentials and for all
            activity that occurs under your account. You are responsible for ensuring your content
            complies with applicable laws and platform policies.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8">Social Platform Compliance</h2>
          <p>
            When using BB Post with third-party platforms such as TikTok, Instagram, or LinkedIn,
            you agree to comply with those platforms&apos; terms of service and community guidelines
            in addition to these terms.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8">Limitation of Liability</h2>
          <p>
            BB Post is provided &quot;as is&quot; without warranty of any kind. We are not liable
            for any damages arising from your use of the service, including lost content, failed
            posts, or platform policy changes.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8">Open Source License</h2>
          <p>
            BB Post is licensed under{' '}
            <a
              href="https://www.gnu.org/licenses/agpl-3.0.html"
              className="text-[#8B5CF6] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              AGPL v3
            </a>
            . The source code is available on{' '}
            <a
              href="https://github.com/BusinessBuilders/BB-Post"
              className="text-[#8B5CF6] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            .
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8">Contact</h2>
          <p>
            For questions about these terms, open a discussion on our{' '}
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
