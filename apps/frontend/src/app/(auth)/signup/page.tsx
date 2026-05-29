import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthShell } from '@gitroom/frontend/components/auth/auth-shell';
import { SignUpForm } from '@gitroom/frontend/components/auth/sign-up-form';

export const metadata: Metadata = {
  title: 'Sign up — D3 Creator',
};

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="New creator"
      heading="Create your D3 account."
      subheading="Add your social profiles on your dashboard and stats appear within 24 hours."
    >
      <SignUpForm />

      <p className="text-caption text-fgMuted text-center">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-fg underline underline-offset-4 hover:text-aurora-cta transition-colors"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
