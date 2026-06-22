export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { CarouselEditorLoader } from '@gitroom/frontend/components/volatis/carousel/carousel-editor-loader.component';

export const metadata: Metadata = {
  title: 'Volatis | Gerador de Carrosséis Virais',
  description: 'Gerador de Carrosséis Virais da Vocaccio',
};

export default async function CriarCarrosselPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; clientId?: string }>;
}) {
  const { id, clientId } = await searchParams;
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <CarouselEditorLoader carouselId={id || 'draft'} crmClientId={clientId || null} />
    </div>
  );
}
