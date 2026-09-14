'use client';

import React, { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';
import clsx from 'clsx';
import { VideoFrame } from '@gitroom/react/helpers/video.frame';
import { Pagination } from '@gitroom/frontend/components/media/media.component';
import { Skeleton } from '@gitroom/react/ui/skeleton';
import { EmptyState } from '@gitroom/react/ui/empty-state';
import { Button } from '@gitroom/react/form/button';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { ThirdPartyProviderCard } from '@gitroom/frontend/components/third-parties/third-party.card';
import { useOpenGuard } from '@gitroom/frontend/components/layout/use.open.guard';
import { Spinner } from '@gitroom/react/ui/spinner';

const ThirdPartyMediaLibraryBrowser: FC<{
  integration: any;
  onImported: () => void;
}> = ({ integration, onImported }) => {
  const fetch = useFetch();
  const t = useT();
  const toaster = useToaster();
  const modals = useModals();
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  const loadMedia = useCallback(async () => {
    return (
      await fetch(`/third-party/function/${integration.id}/listMedia`, {
        body: JSON.stringify({ page: page + 1 }),
        method: 'POST',
      })
    ).json();
  }, [integration.id, page]);

  const { data, isLoading } = useSWR(
    `media-library-${integration.id}-${page}`,
    loadMedia,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      // `page` is in the key, so each page click is a new key and the grid
      // would empty between pages without this.
      keepPreviousData: true,
    }
  );

  const toggleSelect = useCallback(
    (item: any) => {
      const exists = selected.find((s) => s.id === item.id);
      if (exists) {
        setSelected(selected.filter((s) => s.id !== item.id));
      } else {
        setSelected([...selected, item]);
      }
    },
    [selected]
  );

  const importSelected = useCallback(async () => {
    if (!selected.length) return;
    setImporting(true);
    try {
      const response = await fetch(`/third-party/${integration.id}/import`, {
        method: 'POST',
        body: JSON.stringify({
          items: selected.map((s) => ({ url: s.url, name: s.name })),
        }),
      });

      // customFetch does not reject on a non-2xx, so the catch below only ever
      // saw network errors: a 404 or 500 from the import still announced
      // "Media imported successfully" and closed the modal.
      if (!response.ok) {
        const body = await response.json().catch((): undefined => undefined);
        if (!body?.cancelled) {
          toaster.show(
            typeof body?.message === 'string'
              ? body.message
              : t('media_import_failed', 'Failed to import media'),
            'warning'
          );
        }
        return;
      }

      toaster.show(
        t('media_imported_successfully', 'Media imported successfully'),
        'success'
      );
      onImported();
      modals.closeCurrent();
    } catch {
      toaster.show(
        t('media_import_failed', 'Failed to import media'),
        'warning'
      );
    } finally {
      setImporting(false);
    }
  }, [selected, integration.id, fetch, toaster, t, onImported, modals]);

  return (
    <div className="flex flex-col gap-[16px] h-full">
      <div className="text-[14px] font-[600]">
        {t('select_media_to_import', 'Select media to import from')}{' '}
        {integration.title}: {integration.name}
      </div>
      <div className="flex-1 relative">
        <div className="absolute left-0 top-0 w-full h-full overflow-x-hidden overflow-y-auto scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner">
          {/* Three branches that have to be exhaustive as well as exclusive.
              `!data?.results?.length` rather than `!data`: with
              `keepPreviousData` a page change hands back laggy data while
              `isLoading` is true, so gating on `data` alone left
              "loading, and what we're holding is empty" matching nothing at
              all — a blank pane. */}
          {isLoading && !data?.results?.length && (
            <div className="grid grid-cols-4 gap-[8px]">
              {[...new Array(8)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-[6px]" />
              ))}
            </div>
          )}
          {/* `!isLoading`, not `!!data`: the fetcher has no error branch, so a
              rejected request leaves `data` undefined with `isLoading` false.
              Gating on `data` there left the pane completely blank. */}
          {!isLoading && !data?.results?.length && (
            <div className="flex items-center justify-center h-full text-textColor/60">
              {t('no_media_found', 'No media found')}
            </div>
          )}
          {!!data?.results?.length && (
            <div className="grid grid-cols-4 gap-[8px]">
              {data.results.map((item: any) => {
                const isSelected = !!selected.find((s) => s.id === item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelect(item)}
                    className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-[6px] group"
                  >
                    <div
                      className={clsx(
                        'absolute inset-0 border-[4px] rounded-[6px]',
                        isSelected ? 'border-pqBrand' : 'border-transparent'
                      )}
                    >
                      {item.type === 'video' ? (
                        <VideoFrame url={item.thumbnail || item.url} />
                      ) : (
                        <img
                          className="h-full w-full object-cover rounded-[4px]"
                          src={item.thumbnail || item.url}
                          alt={item.name || ''}
                        />
                      )}
                    </div>
                    {isSelected && (
                      <div className="text-white flex z-[10] justify-center items-center text-[14px] font-[500] w-[24px] h-[24px] rounded-full bg-pqBrand absolute -bottom-[2px] -end-[2px]">
                        {selected.findIndex((s) => s.id === item.id) + 1}
                      </div>
                    )}
                    {item.name && (
                      <div className="absolute bottom-[4px] start-[4px] text-[10px] text-white bg-black/50 px-[4px] rounded truncate max-w-[90%]">
                        {item.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {(data?.pages || 0) > 1 && (
        <Pagination current={page} totalPages={data?.pages} setPage={setPage} />
      )}
      <div className="flex justify-end gap-[8px]">
        <button
          onClick={() => modals.closeCurrent()}
          className="cursor-pointer h-[52px] px-[20px] items-center justify-center border border-newTextColor/10 flex rounded-[10px]"
        >
          {t('cancel', 'Cancel')}
        </button>
        <button
          onClick={importSelected}
          disabled={!selected.length || importing}
          className="cursor-pointer text-white disabled:opacity-80 disabled:cursor-not-allowed h-[52px] px-[20px] items-center justify-center bg-pqBrand flex rounded-[10px] gap-[8px]"
        >
          {importing && <Spinner width={16} height={16} />}
          {t('import_selected', 'Import Selected')} ({selected.length})
        </button>
      </div>
    </div>
  );
};

/**
 * Media-library importer picker. Its own SWR rather than the button's: the
 * modal's children are built once at open time, so data arriving later has to
 * re-render from inside the modal. Same shape as the composer's Integrations
 * picker (`third-party.media.tsx`) — the two are twins and used to drift.
 */
const useMediaLibraryThirdParties = () => {
  const fetch = useFetch();

  const loadThirdParties = useCallback(async () => {
    const rows = await (await fetch('/third-party')).json();
    // See the twin in `third-party.media.tsx`: an error body is not an array,
    // and .filter() on it throws where SWR swallows it.
    return Array.isArray(rows)
      ? rows.filter((f: any) => f.position === 'media-library')
      : [];
  }, [fetch]);

  return useSWR('third-party-media-library', loadThirdParties, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
  });
};

const ThirdPartyMediaLibraryPicker: FC<{
  closeModal: () => void;
  onImported: () => void;
}> = ({ closeModal, onImported }) => {
  const [selected, setSelected] = useState<any>(null);
  const t = useT();
  const { data, isLoading } = useMediaLibraryThirdParties();

  if (selected) {
    return (
      <div className="flex flex-col h-full">
        {/* Channels-style boxed back — muted pill, not a faint text link. */}
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="mb-[10px] flex h-[28px] w-fit items-center gap-[5px] self-start rounded-[8px] bg-pqSettings pe-[10px] ps-[7px] text-[12px] font-[600] text-pqText transition-colors hover:bg-pqHover"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            aria-hidden="true"
            className="rtl:rotate-180"
          >
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t('back', 'Back')}
        </button>
        <ThirdPartyMediaLibraryBrowser
          integration={selected}
          onImported={onImported}
        />
      </div>
    );
  }

  if (isLoading) {
    return <LoadingComponent width={40} height={40} />;
  }

  if (!data?.length) {
    return (
      <EmptyState
        title={t('no_integrations_yet', 'No Integrations Yet')}
        description={t(
          'no_media_library_integrations_description',
          'Connect a tool like Reel.Farm to import videos straight into your library.'
        )}
        action={
          <Button
            onClick={() => {
              closeModal();
              // New tab on purpose: the media library often opens from inside
              // the composer, which holds an unsaved draft.
              window.open('/settings?tab=integrations', '_blank');
            }}
          >
            {t('go_to_integrations', 'Go to integrations')}
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-[12px] [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
      {data.map((p: any) => (
        <ThirdPartyProviderCard
          key={p.id}
          provider={p}
          // Not "Import" — the modal is already titled "Import From" and its
          // trigger says Import. This opens the provider's library; the actual
          // import is the "Import Selected" button on the next screen.
          actionLabel={t('browse', 'Browse')}
          onSelect={() => setSelected(p)}
        />
      ))}
    </div>
  );
};

export const ThirdPartyMediaLibrary: FC<{
  onImported: () => void;
  /**
   * Mirrors `brandUploadBtn` in media.box: this button always stands beside
   * Upload, so it takes Upload's two sizes rather than a third one of its own.
   * `page` is the design's 36px toolbar control on /media; `picker` is the
   * taller 44px control inside the composer's Insert Media sheet.
   */
  size?: 'page' | 'picker';
}> = ({ onImported, size = 'page' }) => {
  const t = useT();
  const modals = useModals();
  const canOpen = useOpenGuard();

  return (
    <button
      // Handle for the screenshot tool, like Insert Media's.
      data-pq="import-from"
      onClick={() => {
        if (!canOpen()) {
          return;
        }
        modals.openModal({
          title: t('import_from', 'Import From'),
          fullScreen: true,
          size: 'calc(100% - 80px)',
          height: 'calc(100% - 80px)',
          children: (close) => (
            <ThirdPartyMediaLibraryPicker
              closeModal={close}
              onImported={onImported}
            />
          ),
        });
      }}
      // `changeColor` used to sit here. Its only rule is `.forceChange
      // .changeColor` and `forceChange` is on nothing in this app any more, so
      // it was styling exactly nothing. `bg-pqBtnSimple` is the same colour as
      // the old `bg-btnSimple`, reached through the current token rather than
      // the legacy `--new-*` alias kept alive only for unconverted screens.
      className={clsx(
        'flex shrink-0 cursor-pointer items-center justify-center bg-pqBtnSimple font-[600] text-pqText transition-colors hover:bg-pqHover',
        size === 'picker'
          ? 'h-[44px] gap-[8px] rounded-[8px] px-[18px] text-[14px]'
          : 'h-[36px] gap-[7px] rounded-pqSm px-[14px] text-[13px]'
      )}
    >
      {/* 15px stroked, matching UploadArrowIcon and every other icon in this
          toolbar. It was a 14px solid glyph, which read heavier than the
          button beside it. */}
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 4v12M7.5 11.5 12 16l4.5-4.5M4 20h16"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{t('import', 'Import')}</span>
    </button>
  );
};
