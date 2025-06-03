import { ReactNode } from 'react';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';
export default async function IntegrationLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getT();

  return (
    <div className="text-6xl text-center mt-[50px]">
      {t('adding_channel_redirecting_you', 'Adding channel, Redirecting You')}
      {children}
    </div>
  );
}
