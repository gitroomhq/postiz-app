export const dynamic = 'force-dynamic';
import { LaunchesComponent } from '@gitroom/frontend/components/launches/launches.component';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vocaccio — Volatis',
  description: 'Conteúdo & publicação',
};

export default function VolatisPage() {
  return <LaunchesComponent />;
}
