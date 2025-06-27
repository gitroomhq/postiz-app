export const dynamic = 'force-dynamic';
import { AnalyticsComponent } from '@chaolaolo/frontend/components/analytics/analytics.component';
import { Metadata } from 'next';
import { PlatformAnalytics } from '@chaolaolo/frontend/components/platform-analytics/platform.analytics';
import { isGeneralServerSide } from '@chaolaolo/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Analytics`,
  description: '',
};
export default async function Index() {
  return (
    <>
      {isGeneralServerSide() ? <PlatformAnalytics /> : <AnalyticsComponent />}
    </>
  );
}
