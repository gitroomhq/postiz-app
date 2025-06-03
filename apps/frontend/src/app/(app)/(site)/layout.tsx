import { LayoutSettings } from '@gitroom/frontend/components/layout/layout.settings';
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LayoutSettings>{children}</LayoutSettings>;
}
