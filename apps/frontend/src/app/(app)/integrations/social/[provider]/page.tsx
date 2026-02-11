import { ContinueIntegration } from '@gitroom/frontend/components/launches/continue.integration';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function Page({
  params: { provider },
  searchParams,
}: {
  params: {
    provider: string;
  };
  searchParams: any;
}) {
  const get = cookies().get('auth');
  return <ContinueIntegration searchParams={searchParams} provider={provider} logged={!!get?.name} />;
}
