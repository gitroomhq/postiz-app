import { SettingsSidebar } from '@gitroom/frontend/components/settings/settings-sidebar.component';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SettingsSidebar />
      {children}
    </>
  );
}
