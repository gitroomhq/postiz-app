export const dynamic = 'force-dynamic';
import { AdminAccessComponent } from '@gitroom/frontend/components/admin/admin-access.component';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Postmonster Admin`,
  description: '',
};

// postmonster: admin console - access requests, invites, users (PRD 6).
// Hidden from the navigation; the API behind it only answers to super admins
export default async function Page(params: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const search = (await params?.searchParams) || {};
  return (
    <div className="bg-newBgColorInner flex-1 flex-col flex p-[20px] gap-[12px]">
      <AdminAccessComponent
        initialTab={typeof search.tab === 'string' ? search.tab : undefined}
      />
    </div>
  );
}
