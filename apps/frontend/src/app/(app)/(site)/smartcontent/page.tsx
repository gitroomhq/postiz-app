export const dynamic = 'force-dynamic';
// import { SmartContentComponent } from '@gitroom/frontend/components/smartcontent/smartcontent.component';
import { Metadata } from 'next';
import SmartContentComponent from '@gitroom/frontend/components/smartcontent/smartcontent.component';

export default async function Index() {
  return <SmartContentComponent />;
}
