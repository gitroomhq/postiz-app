export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { DashboardComponent } from '@gitroom/frontend/components/dashboard/dashboard.component';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Mapped Out Social' : 'Gitroom'} Dashboard`,
  description: '',
};

export default async function Index() {
  return <DashboardComponent />;
}
