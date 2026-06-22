export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { Metadata } from 'next';
import { CarouselGallery } from '@gitroom/frontend/components/volatis/carousel/carousel-gallery.component';

export const metadata: Metadata = {
  title: 'Volatis | Carrosséis',
  description: 'Galeria de carrosséis Volatis',
};

export default function CarrosseisPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Suspense>
        <CarouselGallery />
      </Suspense>
    </div>
  );
}
