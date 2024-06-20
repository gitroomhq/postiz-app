import { isGeneral } from '@gitroom/react/helpers/is.general';

export const dynamic = 'force-dynamic';

import { AnalyticsComponent } from '@gitroom/frontend/components/analytics/analytics.component';
import { Metadata } from 'next';
import { PlatformAnalytics } from '@gitroom/frontend/components/platform-analytics/platform.analytics';

export const metadata: Metadata = {
  title: `${isGeneral() ? 'Postiz' : 'Gitroom'} Analytics`,
  description: '',
};

export default async function Index() {
  return (
    <>
      {isGeneral() ? <PlatformAnalytics /> : <AnalyticsComponent />}
    </>
  );
}
