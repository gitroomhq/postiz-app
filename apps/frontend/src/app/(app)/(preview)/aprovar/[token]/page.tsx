import { PortalApprovalPage } from '@gitroom/frontend/components/portal/portal-approval.component';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function AprovarPage({ params }: Props) {
  const { token } = await params;
  return <PortalApprovalPage token={token} />;
}
