import { ClientDetail } from '@gitroom/frontend/components/hub/crm/client-detail.component';

interface Props {
  params: { id: string };
}

export default function CrmClientDetailPage({ params }: Props) {
  return <ClientDetail id={params.id} />;
}
