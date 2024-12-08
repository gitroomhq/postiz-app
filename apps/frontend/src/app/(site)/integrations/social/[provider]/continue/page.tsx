import { HttpStatusCode } from 'axios';

export const dynamic = 'force-dynamic';

import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';
import { redirect } from 'next/navigation';
import { Redirect } from '@gitroom/frontend/components/layout/redirect';

export default async function Page({
  params: { provider },
  searchParams,
}: {
  params: { provider: string };
  searchParams: any;
}) {
  try {
    if (provider === 'x') {
      searchParams = {
        ...searchParams,
        state: searchParams.oauth_token || '',
        code: searchParams.oauth_verifier || '',
        refresh: searchParams.refresh || '',
      };
    }

    const data = await internalFetch(
      `/integrations/social/${provider}/connect`,
      {
        method: 'POST',
        body: JSON.stringify(searchParams),
      }
    );

    if (data.status === HttpStatusCode.NotAcceptable) {
      const { msg } = await data.json();
      return redirect(`/launches?msg=${msg}`);
    }

    if (
      data.status !== HttpStatusCode.Ok &&
      data.status !== HttpStatusCode.Created
    ) {
      return (
        <>
          <div className="mt-[50px] text-[50px]">
            Could not add provider.
            <br />
            You are being redirected back
          </div>
          <Redirect url="/launches" delay={3000} />
        </>
      );
    }

    const { inBetweenSteps, id } = await data.json();
    if (!id || id.length <= 0) {
      throw new Error('Invalid ID');
    }

    if (inBetweenSteps && !searchParams?.refresh) {
      return (
        <>
          <Redirect
            url={`/launches?added=${provider}&continue=${id}`}
            delay={0}
          />
        </>
      );
    } else {
      return (
        <>
          <Redirect
            url={`/launches?added=${provider}&msg=Channel Updated`}
            delay={0}
          />
        </>
      );
    }
  } catch (error) {
    console.error('Error occurred in the Page function:', error);

    // Fallback UI or redirection in case of an error
    return (
      <>
        <div className="mt-[50px] text-[20px] text-red-600">
          An error occurred. Please try again later. You will be redirected to
          home page in 10 seconds.
        </div>
        <Redirect url="/launches" delay={10000} />
      </>
    );
  }
}
