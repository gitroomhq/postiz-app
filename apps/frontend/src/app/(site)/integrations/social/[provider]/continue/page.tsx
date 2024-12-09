import { HttpStatusCode } from 'axios';

export const dynamic = 'force-dynamic';

import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';
import { redirect } from 'next/navigation';
import { Redirect } from '@gitroom/frontend/components/layout/redirect';
import Link from 'next/link';

const ErrorMessage = () => {
  return (
    <>
      <div className="mt-[50px] text-lg text-red-600">
        <span className="font-semibold">
          An error occurred while adding the provider.
        </span>
        <br />
        <span className="text-gray text-base">
          If you are a user of this system, without administrator permissions,
          you will need to ask your administrator to help fix this with you.
        </span>
        <br />
        <span className="text-gray text-base">
          If you are the administrator of this system, the error provided in
          full is provided in the application logs.
        </span>
      </div>
      <Link
        href={'/launches'}
        className="hover:underline text-lg hover:text-forth"
      >
        Click here to go back to the homepage.
      </Link>
    </>
  );
};

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
      return <ErrorMessage />;
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
        <ErrorMessage />
      </>
    );
  }
}
