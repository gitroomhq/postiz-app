import React from 'react';
import { MobileIntegration } from '@gitroom/frontend/components/new-layout/mobile.integration';
import { Metadata } from 'next';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: isGeneralServerSide() ? 'Postiz' : 'Gitroom',
    description: t('add_integration_description', 'Connect a new integration to Postiz'),
  };
}

export default async function Page() {
  return <MobileIntegration />;
}
