export const dynamic = 'force-dynamic';
import { ReligareHome } from '@gitroom/frontend/components/hub/religare/religare-home.component';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vocaccio — Religare',
  description: 'Conexão com sua essência vocacional',
};

export default function ReligarePage() {
  return <ReligareHome />;
}
