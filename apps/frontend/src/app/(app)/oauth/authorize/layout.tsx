import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Authorize',
};

export default async function OAuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="bg-newBgColor flex flex-1 min-h-screen w-screen">
      {children}
    </div>
  );
}
