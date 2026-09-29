'use client';

import React, { FC, useCallback } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Button } from '@gitroom/react/form/button';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { AddProviderButton } from '@gitroom/frontend/components/launches/add.provider.component';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import {
  excerptOf,
  PublicationRow,
  PublicationStatusBadge,
} from '@gitroom/frontend/components/publications/publications.component';
import { mapPostStatus } from '@gitroom/helpers/postmonster/post-status';

// postmonster: Dashboard - the home page after login (PRD 7.1)

interface PublicationList {
  posts: PublicationRow[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

const PostLine: FC<{ row: PublicationRow }> = ({ row }) => {
  const { uploadDirectory } = useVariables();
  return (
    <div className="flex items-center gap-[10px] py-[8px] border-b border-newTableBorder last:border-b-0">
      <div className="flex flex-col gap-[2px] min-w-0 flex-1">
        <div className="truncate text-[13px]">
          {excerptOf(row.content) || row.integration?.name}
        </div>
        <div className="text-[11px] opacity-60 truncate">
          {row.integration?.name} ·{' '}
          {dayjs.utc(row.publishDate).local().format('MMM D, YYYY HH:mm')}
        </div>
      </div>
      <PublicationStatusBadge status={mapPostStatus(row)} />
    </div>
  );
};

export const DashboardComponent = () => {
  const t = useT();
  const fetch = useFetch();
  const user = useUser();
  const modal = useModals();

  const loadIntegrations = useCallback(async () => {
    return (await (await fetch('/integrations/list')).json()).integrations || [];
  }, []);
  const {
    data: integrations,
    isLoading: integrationsLoading,
    mutate: mutateIntegrations,
  } = useSWR('dashboard-integrations', loadIntegrations, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });

  const loadUpcoming = useCallback(async () => {
    const params = new URLSearchParams({
      status: 'scheduled',
      order: 'asc',
      limit: '5',
      page: '0',
    }).toString();
    return (await (await fetch(`/posts/publications?${params}`)).json()) as PublicationList;
  }, []);

  const loadRecent = useCallback(async () => {
    const params = new URLSearchParams({
      status: 'all',
      order: 'desc',
      limit: '5',
      page: '0',
      to: dayjs.utc().format(),
    }).toString();
    return (await (await fetch(`/posts/publications?${params}`)).json()) as PublicationList;
  }, []);

  const {
    data: upcoming,
    isLoading: upcomingLoading,
    mutate: mutateUpcoming,
  } = useSWR('dashboard-upcoming', loadUpcoming, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });

  const {
    data: recent,
    isLoading: recentLoading,
    mutate: mutateRecent,
  } = useSWR('dashboard-recent', loadRecent, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });

  const createPost = useCallback(async () => {
    const date = (await (await fetch('/posts/find-slot')).json()).date;
    modal.openModal({
      id: 'add-edit-modal',
      closeOnClickOutside: false,
      removeLayout: true,
      closeOnEscape: false,
      withCloseButton: false,
      askClose: true,
      fullScreen: true,
      classNames: {
        modal: 'w-[100%] max-w-[1400px] text-textColor',
      },
      children: (
        <AddEditModal
          allIntegrations={(integrations || []).map((p: any) => ({ ...p }))}
          reopenModal={createPost}
          mutate={() => {
            mutateUpcoming();
            mutateRecent();
          }}
          integrations={integrations || []}
          date={dayjs.utc(date).local()}
        />
      ),
      size: '80%',
      title: ``,
    });
  }, [integrations, fetch, modal, mutateUpcoming, mutateRecent]);

  const hasChannels = (integrations || []).length > 0;

  return (
    <div className="flex flex-col gap-[24px] p-[20px] flex-1 overflow-auto">
      <div className="flex flex-col gap-[4px]">
        <div className="text-[24px] font-[600]">
          {t('dashboard_welcome', 'Welcome back, {name}').replace(
            '{name}',
            user?.name || user?.email || ''
          )}
        </div>
        <div className="opacity-70 text-[14px]">
          {t(
            'dashboard_subtitle',
            'Plan, schedule and publish to every network from one calm calendar.'
          )}
        </div>
      </div>

      {integrationsLoading ? (
        <LoadingComponent />
      ) : !hasChannels ? (
        // postmonster: empty state - connect the first channel (PRD 7.4)
        <div className="rounded-[12px] border border-newTableBorder bg-newBgColorInner p-[24px] flex flex-col gap-[12px] items-start">
          <div className="text-[18px] font-[600]">
            {t('dashboard_connect_first', 'Connect your first channel')}
          </div>
          <div className="opacity-70 text-[14px] max-w-[520px]">
            {t(
              'dashboard_connect_first_hint',
              'Add a social network to start planning posts. You can connect as many channels as you need.'
            )}
          </div>
          <div className="w-[240px]">
            <AddProviderButton update={() => mutateIntegrations()} />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-[12px]">
          <Button onClick={createPost}>
            {t('dashboard_create_post', 'Create post')}
          </Button>
          <div className="w-[220px]">
            <AddProviderButton update={() => mutateIntegrations()} />
          </div>
          <Link href="/launches" className="flex">
            <Button secondary>{t('dashboard_open_calendar', 'Open calendar')}</Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
        <div className="rounded-[12px] border border-newTableBorder bg-newBgColorInner p-[16px] flex flex-col">
          <div className="flex items-center justify-between mb-[8px]">
            <div className="text-[16px] font-[600]">
              {t('dashboard_upcoming', 'Next scheduled posts')}
            </div>
            <Link href="/publications" className="text-[13px] underline opacity-70">
              {t('dashboard_view_all', 'View all')}
            </Link>
          </div>
          {upcomingLoading ? (
            <LoadingComponent />
          ) : !upcoming?.posts?.length ? (
            <div className="opacity-60 text-[13px] py-[16px]">
              {t(
                'dashboard_upcoming_empty',
                'Nothing scheduled yet. Plan your first post from the calendar.'
              )}
            </div>
          ) : (
            upcoming.posts.map((row) => <PostLine key={row.id} row={row} />)
          )}
        </div>

        <div className="rounded-[12px] border border-newTableBorder bg-newBgColorInner p-[16px] flex flex-col">
          <div className="flex items-center justify-between mb-[8px]">
            <div className="text-[16px] font-[600]">
              {t('dashboard_recent', 'Latest publications')}
            </div>
            <Link href="/publications" className="text-[13px] underline opacity-70">
              {t('dashboard_view_all', 'View all')}
            </Link>
          </div>
          {recentLoading ? (
            <LoadingComponent />
          ) : !recent?.posts?.length ? (
            <div className="opacity-60 text-[13px] py-[16px]">
              {t(
                'dashboard_recent_empty',
                'Published and failed posts will appear here.'
              )}
            </div>
          ) : (
            recent.posts.map((row) => <PostLine key={row.id} row={row} />)
          )}
        </div>
      </div>
    </div>
  );
};
