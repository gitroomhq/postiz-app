import { IntegrationRedirectComponent } from '@gitroom/frontend/components/launches/integration.redirect.component';

export const dynamic = 'force-dynamic';

export default async function Page({
  params: { provider },
  searchParams,
}: {
  params: { provider: string };
  searchParams: any;
}) {
  return <IntegrationRedirectComponent />;
}
