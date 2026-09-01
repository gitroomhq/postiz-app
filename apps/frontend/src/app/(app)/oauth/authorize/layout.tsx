import { Metadata } from 'next';
import { ReactNode } from 'react';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('authorize_application', 'Authorize Application'),
    description: t(
      'authorize_application_description',
      'Authorize this application to access your Postiz account'
    ),
  };
}

export default async function OAuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="bg-[#0B0A0A] flex flex-1 min-h-screen w-screen">
      {children}
    </div>
  );
}
