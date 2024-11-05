'use client';

import { GeneralPreviewComponent } from '@gitroom/frontend/components/launches/general.preview.component';
import { IntegrationContext } from '@gitroom/frontend/components/launches/helpers/use.integration';
import dayjs from 'dayjs';
import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { LoadingComponent } from '../layout/loading';

interface PreviewProps {
  id: string;
}

export const Preview = ({ id }: PreviewProps) => {
  const fetch = useFetch();

  const getPostsMarketplace = useCallback(async () => {
    return (await fetch(`/posts/${id}`)).json();
  }, [id]);

  const { data, isLoading, error } = useSWR(
    `/posts/${id}`,
    getPostsMarketplace
  );

  if (isLoading) return <LoadingComponent />;

  if (error)
    return (
      <main className="flex mx-auto text-red-400">
        Oops! Something went wrong.
      </main>
    );

  if (!data?.posts)
    return (
      <main className="flex mx-auto">
        <h1>No post founded.</h1>
      </main>
    );

  return (
    <IntegrationContext.Provider
      value={{
        date: dayjs(),
        integration: data?.posts[0]?.integration,
        value: [
          {
            content: data?.posts[0]?.content,
            id: data?.posts[0]?.id,
            image: data?.posts[0]?.image,
          },
        ],
      }}
    >
      <div className="flex mx-auto">
        <GeneralPreviewComponent />
      </div>
    </IntegrationContext.Provider>
  );
};
