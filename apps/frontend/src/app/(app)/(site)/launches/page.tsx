export const dynamic = 'force-dynamic';
import { LaunchesComponent } from '@gitroom/frontend/components/launches/launches.component';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const general = isGeneralServerSide();
  return {
    title: `${general ? 'Postiz' : 'Gitroom'} ${general ? t('calendar', 'Calendar') : t('launches', 'Launches')}`,
    description: general
      ? t('calendar_description', 'Schedule and manage your social media posts')
      : t('launches_description', 'Schedule and manage your social media posts'),
  };
}
export default async function Index() {
  return <LaunchesComponent />;
}
