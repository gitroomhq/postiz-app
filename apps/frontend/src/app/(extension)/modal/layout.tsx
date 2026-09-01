import { ReactNode } from 'react';
import { Metadata } from 'next';
import { AppLayout } from '@gitroom/frontend/components/launches/layout.standalone';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: isGeneralServerSide() ? 'Postiz' : 'Gitroom',
    description: t(
      'extension_modal_description',
      'Compose and schedule posts from the Postiz browser extension'
    ),
  };
}

export default async function AppLayoutIn({
  children,
}: {
  children: ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
