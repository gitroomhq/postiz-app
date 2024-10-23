"use client"

import { GeneralPreviewComponent } from '@gitroom/frontend/components/launches/general.preview.component';
import { IntegrationContext, useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import dayjs from 'dayjs';
import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

interface PreviewProps {
  id: string;
}

export const Preview = ({ id }: PreviewProps) => {
  const fetch = useFetch();

  const getPostsMarketplace = useCallback(async () => {
    return (await fetch(`/posts/${id}`)).json();
  }, []);

  const { data } = useSWR(`/posts/${id}`, getPostsMarketplace);

  const load = useCallback(async (path: string) => {
    return (await (await fetch(path)).json()).integrations;
  }, []);

  const {
    isLoading,
    data: integrations,
    mutate,
  } = useSWR('/integrations/list', load, {
    fallbackData: [],
  });

  console.log("integrations", integrations)

  console.log("data posts", data?.posts[0])

  const value = [{
    content: data?.posts[0].content,
    id: data?.posts[0].id,
    image: data?.posts[0].image
  }]

  if(!data || !integrations) return

  return (
    <IntegrationContext.Provider value={{
      date: dayjs(),
      integration: integrations[0],
      value,
    }}>
      <GeneralPreviewComponent />
    </IntegrationContext.Provider> 
  )
}
