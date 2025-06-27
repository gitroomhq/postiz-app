export const dynamic = 'force-dynamic';
// import { SmartContentComponent } from '@chaolaolo/frontend/components/smartcontent/smartcontent.component';
import { Metadata } from 'next';
import SmartContentComponent from '@chaolaolo/frontend/components/smartcontent/smartcontent.component';

export default async function Index() {
  return <SmartContentComponent />;
}
