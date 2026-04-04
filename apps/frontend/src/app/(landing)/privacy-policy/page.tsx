import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — BB Post',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#0E0E0E] text-white px-6 py-20">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-[#8B5CF6] hover:underline text-sm mb-8 inline-block">
          ← Back to BB Post
        </Link>
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-white/60 mb-8">Last updated: April 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-white/80 leading-relaxed">
          <p>
            BB Post is an open-source social media management platform licensed under AGPL v3. This
            Privacy Policy describes how we collect, use, and protect your information when you use
            BB Post.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8">Information We Collect</h2>
          <p>
            When you create an account we collect your email address and any profile information you
            provide. When you connect social media accounts, we store the OAuth tokens needed to
            publish on your behalf. We do not sell your personal data to third parties.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8">How We Use Your Information</h2>
          <p>
            We use your information solely to provide the BB Post service: scheduling posts,
            generating analytics, and enabling team collaboration. We may send transactional emails
            related to your account.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8">Data Retention</h2>
          <p>
            You may delete your account at any time. Upon deletion, your personal data and connected
            social account tokens are removed from our systems within 30 days.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8">Third-Party Platforms</h2>
          <p>
            BB Post integrates with third-party social media platforms (TikTok, Instagram, LinkedIn,
            etc.). Your use of those platforms is governed by their respective privacy policies. We
            access only the permissions you explicitly grant.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8">Open Source</h2>
          <p>
            BB Post is fully open source. You can review the complete source code on{' '}
            <a
              href="https://github.com/BusinessBuilders/BB-Post"
              className="text-[#8B5CF6] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            . Self-hosted deployments are subject to this policy only for the hosted service.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8">Contact</h2>
          <p>
            For privacy inquiries, open a discussion on our{' '}
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
