'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Button } from '@gitroom/react/form/button';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import {
  mapPostStatus,
  PublicationStatus,
  publicationStatusLabel,
} from '@gitroom/helpers/postmonster/post-status';
import {
  ExistingDataContextProvider,
} from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';

// postmonster: Publications page (PRD 7.1) - post history of the workspace
// with the unified statuses (PRD 7.3)

export interface PublicationRow {
  id: string;
  content: string;
  publishDate: string;
  releaseURL: string | null;
  state: string;
  error: string | null;
  image: string | null;
  group: string;
  integration: {
    id: string;
    providerIdentifier: string;
    name: string;
    picture: string | null;
  };
}

interface PublicationList {
  posts: PublicationRow[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

const STATUS_COLORS: Record<PublicationStatus, string> = {
  draft: 'bg-sixth text-textColor border-newTableBorder',
  scheduled: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  publishing: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  published: 'bg-green-500/15 text-green-400 border-green-500/30',
  failed: 'bg-red-500/15 text-red-400 border-red-500/30',
  needs_check: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

export const PublicationStatusBadge: FC<{ status: PublicationStatus }> = ({
  status,
}) => {
  const t = useT();
  const labelKey = `publication_status_${status}`;
  return (
    <span
      className={`inline-flex px-[8px] py-[2px] rounded-[4px] border text-[12px] whitespace-nowrap ${
        STATUS_COLORS[status] || 'bg-sixth border-newTableBorder'
      }`}
    >
      {t(labelKey, publicationStatusLabel[status])}
    </span>
  );
};

export const thumbnailOf = (
  row: PublicationRow,
  uploadDirectory: string
) => {
  try {
    const images = JSON.parse(row.image || '[]');
    const first = images?.[0];
    if (!first) {
      return '';
    }
    if (first.url) {
      return first.url;
    }
    if (first.path && first.path.indexOf('http') === 0) {
      return first.path;
    }
    return first.path ? `/${uploadDirectory}${first.path}` : '';
  } catch (err) {
    return '';
  }
};

export const excerptOf = (content: string) => {
  const text = (content || '').replace(/\s+/g, ' ').trim();
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
};

const Pagination: FC<{
  page: number;
  limit: number;
  total: number;
  onPage: (page: number) => void;
}> = ({ page, limit, total, onPage }) => {
  const t = useT();
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex items-center justify-between text-[13px] opacity-80">
      <div>
        {t('publications_total_rows', '{total} total').replace(
          '{total}',
          String(total)
        )}
      </div>
      <div className="flex gap-[8px] items-center">
        <Button secondary disabled={page === 0} onClick={() => onPage(page - 1)}>
          {t('admin_prev', 'Previous')}
        </Button>
        <span>
          {page + 1} / {totalPages}
        </span>
        <Button
          secondary
          disabled={page + 1 >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          {t('admin_next', 'Next')}
        </Button>
      </div>
    </div>
  );
};

export const PublicationsComponent = () => {
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();
  const modal = useModals();
  const { uploadDirectory } = useVariables();

  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('all');
  const [integrationId, setIntegrationId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = useMemo(() => {
    return new URLSearchParams({
      page: page.toString(),
      limit: '20',
      status,
      ...(integrationId ? { integrationId } : {}),
      ...(from ? { from: dayjs(from).startOf('day').utc().format() } : {}),
      ...(to ? { to: dayjs(to).endOf('day').utc().format() } : {}),
    }).toString();
  }, [page, status, integrationId, from, to]);

  const load = useCallback(async () => {
    return (await (await fetch(`/posts/publications?${params}`)).json()) as PublicationList;
  }, [params]);

  const { data, isLoading, mutate } = useSWR(`publications-${params}`, load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });

  const loadIntegrations = useCallback(async () => {
    return (await (await fetch('/integrations/list')).json()).integrations || [];
  }, []);
  const { data: integrations } = useSWR(
    'publications-integrations',
    loadIntegrations,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  const openPublished = useCallback((row: PublicationRow) => {
    if (row.releaseURL) {
      window.open(row.releaseURL, '_blank');
      return;
    }
    window.open(`/p/${row.id}?share=true`, '_blank');
  }, []);

  const editPost = useCallback(
    (row: PublicationRow) => async () => {
      const groupData = await (await fetch(`/posts/group/${row.group}`)).json();
      const publishDate = dayjs.utc(groupData.posts[0].publishDate).local();
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
          <ExistingDataContextProvider value={groupData}>
            <AddEditModal
              allIntegrations={(integrations || []).map((p: any) => ({
                ...p,
              }))}
              reopenModal={editPost(row)}
              mutate={mutate}
              integrations={(integrations || [])
                .filter((p: any) => p.id === groupData.integration)
                .map((p: any) => ({
                  ...p,
                  picture: groupData.integrationPicture,
                }))}
              date={publishDate}
            />
          </ExistingDataContextProvider>
        ),
        size: '80%',
        title: ``,
      });
    },
    [integrations, fetch, modal, mutate]
  );

  const retryPost = useCallback(
    (row: PublicationRow) => async () => {
      if (
        !(await deleteDialog(
          t(
            'publications_retry_confirm',
            'Publish this post again? If it was already published to the network, this can create a duplicate.'
          ),
          t('publications_retry_title', 'Retry publishing')
        ))
      ) {
        return;
      }
      const date = dayjs.utc(row.publishDate).isAfter(dayjs.utc())
        ? row.publishDate
        : dayjs.utc().format();
      const response = await fetch(`/posts/${row.id}/date`, {
        method: 'PUT',
        body: JSON.stringify({ date, action: 'schedule', republish: true }),
      });
      if (!response.ok) {
        toast.show(await response.text(), 'warning');
        return;
      }
      toast.show(
        t('publications_retry_queued', 'The post was queued for publishing'),
        'success'
      );
      mutate();
    },
    [fetch, t, toast, mutate]
  );

  return (
    <div className="flex flex-col gap-[12px] p-[20px] flex-1 overflow-auto">
      <div className="flex flex-wrap gap-[12px] items-end">
        <div className="flex flex-col gap-[6px]">
          <div className="text-[12px] opacity-70">
            {t('publications_status', 'Status')}
          </div>
          <select
            value={status}
            onChange={(e) => {
              setPage(0);
              setStatus(e.target.value);
            }}
            className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor min-w-[160px]"
          >
            <option value="all">{t('publications_all_statuses', 'All statuses')}</option>
            <option value="draft">{publicationStatusLabel.draft}</option>
            <option value="scheduled">{publicationStatusLabel.scheduled}</option>
            <option value="publishing">{publicationStatusLabel.publishing}</option>
            <option value="published">{publicationStatusLabel.published}</option>
            <option value="failed">{publicationStatusLabel.failed}</option>
            <option value="needs_check">{publicationStatusLabel.needs_check}</option>
          </select>
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="text-[12px] opacity-70">
            {t('publications_channel', 'Channel')}
          </div>
          <select
            value={integrationId}
            onChange={(e) => {
              setPage(0);
              setIntegrationId(e.target.value);
            }}
            className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor min-w-[180px]"
          >
            <option value="">{t('publications_all_channels', 'All channels')}</option>
            {(integrations || []).map((integration: any) => (
              <option key={integration.id} value={integration.id}>
                {integration.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="text-[12px] opacity-70">{t('publications_from', 'From')}</div>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setPage(0);
              setFrom(e.target.value);
            }}
            className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor"
          />
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="text-[12px] opacity-70">{t('publications_to', 'To')}</div>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setPage(0);
              setTo(e.target.value);
            }}
            className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor"
          />
        </div>
        <Button
          secondary
          onClick={() => {
            setPage(0);
            setStatus('all');
            setIntegrationId('');
            setFrom('');
            setTo('');
          }}
        >
          {t('publications_reset', 'Reset')}
        </Button>
      </div>

      {isLoading ? (
        <LoadingComponent />
      ) : !data || data.posts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-[12px] text-center py-[40px]">
          <div className="opacity-70">
            {t('publications_empty', 'No publications yet.')}
          </div>
          <div className="opacity-50 text-[13px]">
            {t(
              'publications_empty_hint',
              'Posts you schedule or publish will show up here with their status.'
            )}
          </div>
          <Button onClick={() => (window.location.href = '/launches')}>
            {t('publications_empty_cta', 'Create a post')}
          </Button>
        </div>
      ) : (
        <>
          <div className="border border-newTableBorder rounded-[8px] overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[180px_1.5fr_150px_120px_1.2fr_170px] gap-[12px] px-[12px] py-[10px] bg-newBgColorInner text-[12px] uppercase opacity-70 border-b border-newTableBorder">
                <div>{t('publications_channel', 'Channel')}</div>
                <div>{t('publications_preview', 'Preview')}</div>
                <div>{t('publications_when', 'Date')}</div>
                <div>{t('publications_status', 'Status')}</div>
                <div>{t('publications_result', 'Link / Error')}</div>
                <div className="text-right">{t('admin_actions', 'Actions')}</div>
              </div>
              {data.posts.map((row) => {
                const postStatus = mapPostStatus(row);
                const thumbnail = thumbnailOf(row, uploadDirectory);
                return (
                  <div
                    key={row.id}
                    className="grid grid-cols-[180px_1.5fr_150px_120px_1.2fr_170px] gap-[12px] px-[12px] py-[10px] border-b border-newTableBorder items-center text-[13px]"
                  >
                    <div className="flex items-center gap-[8px] min-w-0">
                      {row.integration?.picture && (
                        <img
                          src={row.integration.picture}
                          className="w-[24px] h-[24px] rounded-full object-cover"
                          alt=""
                        />
                      )}
                      <div className="truncate">{row.integration?.name}</div>
                    </div>
                    <div className="flex items-center gap-[10px] min-w-0">
                      {thumbnail && (
                        <img
                          src={thumbnail}
                          className="w-[40px] h-[40px] rounded-[6px] object-cover"
                          alt=""
                        />
                      )}
                      <div className="truncate opacity-80">
                        {excerptOf(row.content) || '-'}
                      </div>
                    </div>
                    <div className="opacity-80">
                      {dayjs.utc(row.publishDate).local().format('MMM D, YYYY HH:mm')}
                    </div>
                    <div>
                      <PublicationStatusBadge status={postStatus} />
                    </div>
                    <div className="min-w-0">
                      {row.releaseURL ? (
                        <a
                          href={row.releaseURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline opacity-80 truncate block"
                        >
                          {row.releaseURL}
                        </a>
                      ) : row.error ? (
                        <div
                          className="truncate opacity-80 text-red-400"
                          title={row.error}
                        >
                          {row.error}
                        </div>
                      ) : (
                        <div className="opacity-40">-</div>
                      )}
                    </div>
                    <div className="flex gap-[8px] justify-end">
                      <Button secondary onClick={() => openPublished(row)}>
                        {t('publications_open', 'Open')}
                      </Button>
                      {postStatus === 'scheduled' && (
                        <Button secondary onClick={editPost(row)}>
                          {t('publications_edit', 'Edit')}
                        </Button>
                      )}
                      {(postStatus === 'failed' ||
                        postStatus === 'needs_check') && (
                        <Button secondary onClick={retryPost(row)}>
                          {t('publications_retry', 'Retry')}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <Pagination
            page={data.page}
            limit={data.limit}
            total={data.total}
            onPage={setPage}
          />
        </>
      )}
    </div>
  );
};
