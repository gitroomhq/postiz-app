import { SettingsPage } from '@gitroom/frontend/components/layout/settings.component';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Settings',
};
export default async function Index() {
  return <SettingsPage mode="page" />;
}
