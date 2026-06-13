export const dynamic = 'force-dynamic';
import { VolatisCockpit } from '@gitroom/frontend/components/hub/volatis-cockpit.component';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vocaccio — Volatis',
  description: 'Conteúdo & publicação',
};

export default function VolatisPage() {
  return <VolatisCockpit />;
}
