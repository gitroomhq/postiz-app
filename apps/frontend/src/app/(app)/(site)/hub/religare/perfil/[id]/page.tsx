import { ReligareProfile } from '@gitroom/frontend/components/hub/religare/religare-profile.component';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReligareProfilePage({ params }: Props) {
  const { id } = await params;
  return <ReligareProfile id={id} />;
}
