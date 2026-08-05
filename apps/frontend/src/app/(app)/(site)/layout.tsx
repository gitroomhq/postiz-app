import { LayoutComponent } from '@gitroom/frontend/components/new-layout/layout.component';

export default async function Layout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <LayoutComponent overlay={modal}>{children}</LayoutComponent>
  );
}
