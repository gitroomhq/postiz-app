export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import { ReligareOnboarding } from '@gitroom/frontend/components/hub/religare/religare-onboarding.component';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vocaccio — Novo Religare',
  description: 'Criar leitura de essência',
};

export default function ReligareOnboardingPage() {
  return (
    <Suspense>
      <ReligareOnboarding />
    </Suspense>
  );
}
