import { ClientDetail } from '@gitroom/frontend/components/hub/crm/client-detail.component';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CrmClientDetailPage({ params }: Props) {
  const { id } = await params;
  return <ClientDetail id={id} />;
}
