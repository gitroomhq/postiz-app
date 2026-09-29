export const dynamic = 'force-dynamic';
import { DashboardComponent } from '@gitroom/frontend/components/dashboard/dashboard.component';
import { Metadata } from 'next';

// postmonster: Dashboard is the home page after login (PRD 7.1)
export const metadata: Metadata = {
  title: `Postmonster Dashboard`,
  description: '',
};

export default async function Index() {
  return <DashboardComponent />;
}
