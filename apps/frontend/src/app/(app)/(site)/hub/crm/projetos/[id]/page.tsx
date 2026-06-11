import { CrmProjectDetailClient } from '@gitroom/frontend/components/hub/crm/project-detail-client.component';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CrmProjectDetailPage({ params }: Props) {
  const { id } = await params;
  return <CrmProjectDetailClient id={id} />;
}
