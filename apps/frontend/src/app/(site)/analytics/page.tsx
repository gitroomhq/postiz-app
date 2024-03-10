export const dynamic = 'force-dynamic';

import {AnalyticsComponent} from "@gitroom/frontend/components/analytics/analytics.component";
import {Metadata} from "next";

export const metadata: Metadata = {
  title: 'Gitroom Analytics',
  description: '',
}

export default async function Index() {
  return (
      <AnalyticsComponent />
  );
}
