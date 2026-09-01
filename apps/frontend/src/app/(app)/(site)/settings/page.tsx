import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';
export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} ${t('settings', 'Settings')}`,
    description: t('settings_description', 'Manage your Postiz account and preferences'),
  };
}
export default async function Page() {
  return redirect('/settings/global-settings');
}
