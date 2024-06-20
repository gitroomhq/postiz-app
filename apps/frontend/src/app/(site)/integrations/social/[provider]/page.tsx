export const dynamic = 'force-dynamic';

import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';
import { redirect } from 'next/navigation';

export default async function Page({
  params: { provider },
  searchParams,
}: {
  params: { provider: string };
  searchParams: any;
}) {
  if (provider === 'x') {
    searchParams = {
      ...searchParams,
      state: searchParams.oauth_token || '',
      code: searchParams.oauth_verifier || '',
      refresh: searchParams.refresh || '',
    };
  }

  const { id, inBetweenSteps } = await (
    await internalFetch(`/integrations/social/${provider}/connect`, {
      method: 'POST',
      body: JSON.stringify(searchParams),
    })
  ).json();

  if (inBetweenSteps && !searchParams.refresh) {
    return redirect(`/launches?added=${provider}&continue=${id}`);
  }

  return redirect(`/launches?added=${provider}`);
}
