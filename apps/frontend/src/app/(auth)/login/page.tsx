import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthShell } from '@gitroom/frontend/components/auth/auth-shell';
import { SignInForm } from '@gitroom/frontend/components/auth/sign-in-form';

export const metadata: Metadata = {
  title: 'Sign in — D3 Creator',
};

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirectTo } = await searchParams;

  return (
    <AuthShell
      eyebrow="Sign in"
      heading="Welcome back."
      subheading="Use your D3 account — admins and creators sign in here."
    >
      <SignInForm redirectTo={redirectTo} />

      <p className="text-caption text-fgMuted text-center">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="text-fg underline underline-offset-4 hover:text-aurora-cta transition-colors"
        >
          Sign up as a creator
        </Link>
      </p>
    </AuthShell>
  );
}
