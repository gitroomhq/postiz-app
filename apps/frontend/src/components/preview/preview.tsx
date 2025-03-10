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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const { data, isLoading, error } = useSWR(
    `/posts/${id}`,
    getPostsMarketplace
  );

  if (isLoading) return <LoadingComponent />;

  if (!data?.posts || error)
    return (
      <main className="flex mx-auto">
        <h1>
          {!data?.posts ? 'No post founded.' : 'Oops! Something went wrong.'}{' '}
        </h1>
      </main>
    );

  const post = data?.posts?.[0];
  if (!post) return null;

  return (
    <IntegrationContext.Provider
      value={{
        date: dayjs(),
        integration: post.integration,
        value: [
          {
            content: post.content,
            id: post.id,
            image: post.image,
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
