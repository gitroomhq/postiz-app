'use client';

import React, {
  ChangeEvent,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
import { Media } from '@prisma/client';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { useToaster } from '@gitroom/react/toaster/toaster';
import clsx from 'clsx';
import { VideoFrame } from '@gitroom/react/helpers/video.frame';
import { useUppyUploader } from '@gitroom/frontend/components/media/new.uploader';
import { DropFiles } from '@gitroom/frontend/components/layout/drop.files';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { ThirdPartyMediaLibrary } from '@gitroom/frontend/components/third-parties/third-party.media-library';
import { Dashboard } from '@uppy/react';
import { DeleteCircleIcon } from '@gitroom/frontend/components/ui/icons';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useDebounce } from 'use-debounce';
import { useSearchParams } from 'next/navigation';
import { MediaLightbox } from '@gitroom/frontend/components/media/media.lightbox';
import {
  isUiDemoEnabled,
  UI_DEMO_MEDIA,
} from '@gitroom/frontend/components/media/ui-demo-media';
import { Pagination } from '@gitroom/frontend/components/media/media.pagination';
import { MediaComponentInner } from '@gitroom/frontend/components/launches/helpers/media.settings.component';
import { useAnchoredPopover } from '@gitroom/frontend/components/layout/use.anchored.popover';
import { createPortal } from 'react-dom';

const MAX_UPLOAD_SIZE = 1024 * 1024 * 1024; // 1 GB

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

type MediaRow = Media & {
  uiDemo?: boolean;
  meta?: string;
  duration?: string;
  modified?: string;
  kind?: 'image' | 'video';
  thumbGradient?: string;
  fileSize?: number;
};

const formatMediaMeta = (media: MediaRow) => {
  if (media.meta) return media.meta;
  const name = media.originalName || media.name || media.path || '';
  const isVideo = hasExtension(media.path, 'mp4');
  const ext = name.split('.').pop()?.toUpperCase() || (isVideo ? 'MP4' : 'PNG');
  if (media.fileSize && media.fileSize > 0) {
    return `${ext} · ${formatSize(media.fileSize)}`;
  }
  return ext;
};

const isVideoMedia = (media: { path: string }) =>
  hasExtension(media.path, 'mp4') || /\.webm$/i.test(media.path);

const UploadArrowIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
    <path
      d="M12 16V4M7.5 8.5 12 4l4.5 4.5M4 20h16"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const GridIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
    <path
      d="M4.5 4.5h6v6h-6v-6ZM13.5 4.5h6v6h-6v-6ZM4.5 13.5h6v6h-6v-6ZM13.5 13.5h6v6h-6v-6Z"
      stroke="currentColor"
      strokeWidth="1.7"
    />
  </svg>
);

const ListIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
    <path
      d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const SearchIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="15"
    height="15"
    fill="none"
    className="pointer-events-none absolute start-[10px] top-[11px] text-pqSoft"
  >
    <path
      d="M17 17l4 4M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const MediaThumb: FC<{ media: MediaRow; className?: string }> = ({
  media,
  className,
}) => {
  const mediaDirectory = useMediaDirectory();
  const video = isVideoMedia(media);
  // Demo videos are gradient tiles (sample URL is lightbox-only). Demo stills
  // paint the same gradient under the data-URI so a failed load never shows a
  // generic glyph.
  if (media.uiDemo && video) {
    return (
      <div
        className={clsx('h-full w-full', className)}
        style={{ background: media.thumbGradient }}
      />
    );
  }
  if (video) {
    return (
      <VideoFrame url={mediaDirectory.set(media.path)} />
    );
  }
  return (
    <div
      className={clsx('h-full w-full', className)}
      style={
        media.uiDemo && media.thumbGradient
          ? { background: media.thumbGradient }
          : undefined
      }
    >
      <img
        className="h-full w-full object-cover"
        src={media.uiDemo ? media.path : mediaDirectory.set(media.path)}
        alt={media.originalName || media.name || 'media'}
      />
    </div>
  );
};

export const MediaBox: FC<{
  setMedia: (params: { id: string; path: string }[]) => void;
  standalone?: boolean;
  type?: 'image' | 'video';
  closeModal: () => void;
}> = ({ type, standalone, setMedia }) => {
  const [page, setPage] = useState(0);
  const [accumulated, setAccumulated] = useState<MediaRow[]>([]);
  const [tab, setTab] = useState<'all' | 'image' | 'video'>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [lightbox, setLightbox] = useState<MediaRow | null>(null);
  const [menuMedia, setMenuMedia] = useState<MediaRow | null>(null);
  const menuOpen = !!menuMedia;
  const { referenceRef: menuTriggerRef, floatingRef: menuFloatingRef } =
    useAnchoredPopover<HTMLButtonElement, HTMLDivElement>(menuOpen, 'end');
  const activeType = standalone ? (tab === 'all' ? undefined : tab) : type;
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);
  const searchParams = useSearchParams();
  const fetch = useFetch();
  const modals = useModals();
  const toaster = useToaster();
  const t = useT();
  const uploaderRef = useRef<HTMLInputElement>(null);
  const mediaDirectory = useMediaDirectory();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<
    { id: string; path: string; uiDemo?: boolean }[]
  >([]);

  // Only reset pagination when the search query changes. Tab switches are
  // client-side filters over the same fetched rows — clearing `accumulated`
  // here left the grid empty forever because the SWR key does not include
  // `tab`, so nothing re-hydrated the list after the wipe.
  useEffect(() => {
    setPage(0);
    setAccumulated([]);
  }, [debouncedSearch]);

  const loadMedia = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page + 1) });
    if (debouncedSearch.trim()) {
      params.set('search', debouncedSearch.trim());
    }
    return (await fetch(`/media?${params.toString()}`)).json();
  }, [page, debouncedSearch, fetch]);

  const { data, mutate, isLoading } = useSWR(
    `get-media-${page}-${debouncedSearch}`,
    loadMedia
  );

  useEffect(() => {
    if (!data?.results) return;
    if (!standalone) {
      setAccumulated(data.results);
      return;
    }
    setAccumulated((prev) => {
      if (page === 0) return data.results;
      const ids = new Set(prev.map((p) => p.id));
      return [...prev, ...data.results.filter((r: MediaRow) => !ids.has(r.id))];
    });
  }, [data, page, standalone]);

  // Remember whether the unfiltered library is empty so a search that returns
  // nothing does not suddenly inject demo fixtures over a real account.
  const [libraryEmpty, setLibraryEmpty] = useState(false);
  useEffect(() => {
    if (isLoading || page !== 0) return;
    if (!debouncedSearch.trim()) {
      setLibraryEmpty((data?.results?.length ?? 0) === 0);
    } else if ((data?.results?.length ?? 0) > 0) {
      setLibraryEmpty(false);
    }
  }, [isLoading, data, page, debouncedSearch]);

  const useDemo =
    !isLoading &&
    (data?.results?.length ?? 0) === 0 &&
    isUiDemoEnabled(searchParams.get('uiDemo')) &&
    (!debouncedSearch.trim() || libraryEmpty);

  const sourceRows: MediaRow[] = useMemo(() => {
    if (useDemo) {
      const q = debouncedSearch.trim().toLowerCase();
      return UI_DEMO_MEDIA.filter(
        (m) => !q || m.originalName.toLowerCase().includes(q)
      ) as MediaRow[];
    }
    return (standalone ? accumulated : data?.results || []) as MediaRow[];
  }, [useDemo, debouncedSearch, standalone, accumulated, data]);

  const visibleMedia: MediaRow[] = useMemo(
    () =>
      sourceRows.filter((f) => {
        const video = isVideoMedia(f);
        if (activeType === 'video') return video;
        if (activeType === 'image') return !video;
        return true;
      }),
    [sourceRows, activeType]
  );

  const uppy = useUppyUploader({
    allowedFileTypes:
      type == 'image'
        ? 'image/*'
        : type == 'video'
        ? 'video/mp4'
        : 'image/*,video/mp4',
    onUploadSuccess: async (arr) => {
      await mutate();
      if (standalone) {
        setPage(0);
        return;
      }
      setSelected((prevSelected) => [...prevSelected, ...arr]);
    },
    onStart: () => setLoading(true),
    onEnd: () => setLoading(false),
  });

  const enqueueFiles = useCallback(
    (files: File[]) => {
      if (!files.length) return;
      const totalSize = files.reduce((acc, file) => acc + file.size, 0);
      if (totalSize > MAX_UPLOAD_SIZE) {
        toaster.show(
          t(
            'upload_size_limit_exceeded',
            'Upload size limit exceeded. Maximum 1 GB per upload session.'
          ),
          'warning'
        );
        return;
      }
      setLoading(true);
      for (const file of files) {
        uppy.addFile(file);
      }
    },
    [toaster, t, uppy]
  );

  const dragAndDrop = useCallback(
    (files: File[]) => {
      enqueueFiles(files);
    },
    [enqueueFiles]
  );

  // Paste files onto the media surface (design: "paste or browse").
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items?.length) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length) {
        e.preventDefault();
        enqueueFiles(files);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [enqueueFiles]);

  const addRemoveSelected = useCallback(
    (media: MediaRow) => () => {
      if (standalone) return;
      const exists = selected.find((p) => p.id === media.id);
      if (exists) {
        setSelected(selected.filter((f) => f.id !== media.id));
        return;
      }
      setSelected([
        ...selected,
        { id: media.id, path: media.path, uiDemo: media.uiDemo },
      ]);
    },
    [selected, standalone]
  );

  const addMedia = useCallback(async () => {
    if (standalone) return;
    const real = selected.filter((s) => !s.uiDemo);
    if (real.length === 0 && selected.length > 0) {
      toaster.show(
        t(
          'ui_demo_media_not_insertable',
          'Demo media cannot be inserted into a post. Upload real files first.'
        ),
        'warning'
      );
      return;
    }
    setMedia(real);
    modals.closeCurrent();
  }, [selected, standalone, setMedia, modals, toaster, t]);

  const addToUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      enqueueFiles(Array.from(e.target.files || []));
      e.target.value = '';
    },
    [enqueueFiles]
  );

  const openLightbox = useCallback(
    (media: MediaRow) => (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setMenuMedia(null);
      setLightbox(media);
    },
    []
  );

  const deleteImage = useCallback(
    (media: MediaRow) => async (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setMenuMedia(null);
      if (media.uiDemo) {
        toaster.show(
          t('ui_demo_media_readonly', 'Demo media is read-only.'),
          'warning'
        );
        return;
      }
      if (
        !(await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete_the_image',
            'Are you sure you want to delete the image?'
          )
        ))
      ) {
        return;
      }
      await fetch(`/media/${media.id}`, { method: 'DELETE' });
      setLightbox(null);
      mutate();
    },
    [mutate, fetch, toaster, t]
  );

  const downloadMedia = useCallback(
    (media: MediaRow) => () => {
      const url = media.uiDemo ? media.path : mediaDirectory.set(media.path);
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    [mediaDirectory]
  );

  const openAltText = useCallback(
    (media: MediaRow) => (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setMenuMedia(null);
      if (media.uiDemo) {
        toaster.show(
          t('ui_demo_media_readonly', 'Demo media is read-only.'),
          'warning'
        );
        return;
      }
      modals.openModal({
        title: t('change_alt_text', 'Change alt text'),
        children: (close) => (
          <MediaComponentInner
            media={media as any}
            onClose={close}
            onSelect={() => {
              mutate();
              close();
            }}
          />
        ),
      });
    },
    [modals, t, toaster, mutate]
  );

  const openMenu = useCallback(
    (media: MediaRow) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (menuMedia?.id === media.id) {
        setMenuMedia(null);
        return;
      }
      // Point Floating UI at the clicked ⋯ (many tiles share one popover).
      menuTriggerRef.current = e.currentTarget;
      setMenuMedia(media);
    },
    [menuMedia, menuTriggerRef]
  );

  const sectionLabel =
    tab === 'video'
      ? t('video', 'Video')
      : tab === 'image'
      ? t('images', 'Images')
      : t('all_files', 'All files');

  const totalCount = useDemo
    ? visibleMedia.length
    : Math.max(
        visibleMedia.length,
        ((data?.pages || 1) - 1) * 18 + (data?.results?.length || 0)
      );

  const hasMorePages =
    !useDemo && standalone && page + 1 < (data?.pages || 0);

  const brandUploadBtn = (
    <button
      type="button"
      disabled={loading}
      onClick={() => uploaderRef.current?.click()}
      className="relative flex h-[36px] shrink-0 cursor-pointer items-center gap-[7px] rounded-pqSm bg-pqBrand px-[14px] ps-[12px] text-[13px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover disabled:opacity-70"
    >
      {loading ? (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[16px] w-[16px] animate-spin rounded-full border-2 border-pqOnBrand border-t-transparent" />
        </div>
      ) : (
        <UploadArrowIcon />
      )}
      <span className={loading ? 'invisible' : undefined}>
        {t('upload', 'Upload')}
      </span>
    </button>
  );

  const pickerUploadBtn = (
    <button
      type="button"
      disabled={loading}
      onClick={() => uploaderRef.current?.click()}
      className="relative flex h-[44px] cursor-pointer items-center justify-center gap-[8px] rounded-[8px] bg-pqSettings px-[18px] text-[14px] text-pqText disabled:opacity-70"
    >
      {loading ? (
        <div className="h-[16px] w-[16px] animate-spin rounded-full border-2 border-pqText border-t-transparent" />
      ) : null}
      <span className={loading ? 'invisible' : undefined}>
        {t('upload', 'Upload')}
      </span>
    </button>
  );

  const fileInput = (
    <input
      type="file"
      ref={uploaderRef}
      onChange={addToUpload}
      className="hidden"
      multiple={true}
      accept={
        type == 'image'
          ? 'image/*'
          : type == 'video'
          ? 'video/mp4'
          : 'image/*,video/mp4'
      }
    />
  );

  const uppyBar = (
    <div className="pointer-events-none relative mb-[5px] mt-[5px] w-full">
      <div className="uppyChange absolute left-0 h-[46px] w-full overflow-hidden bg-pqInner">
        <Dashboard
          height={46}
          uppy={uppy}
          id={`uploader-${standalone ? 'page' : 'picker'}`}
          showProgressDetails={true}
          hideUploadButton={true}
          hideRetryButton={true}
          hidePauseResumeButton={true}
          hideCancelButton={true}
          hideProgressAfterFinish={true}
        />
      </div>
      <div className="uppyChange h-[46px] w-full" />
    </div>
  );

  const emptyAfterFilter =
    !isLoading && visibleMedia.length === 0 && !useDemo && !!debouncedSearch;
  const showEmptyState =
    !isLoading && visibleMedia.length === 0 && !useDemo && !debouncedSearch;

  // --- Standalone /media page (design pagesVals isMedia) -------------------
  if (standalone) {
    return (
      <DropFiles
        disabled={loading}
        noClick
        brandOverlay
        className="relative flex min-h-0 flex-1 flex-col bg-pqInner px-[22px] pt-[18px] mobile:px-[14px]"
        onDrop={dragAndDrop}
      >
        {fileInput}
        <div className="mx-auto flex min-h-0 w-full max-w-[980px] flex-1 flex-col gap-[14px]">
          <div className="flex shrink-0 flex-wrap items-center gap-[10px]">
            <div className="flex items-center gap-[3px] rounded-pqSm bg-pqSettings p-[3px]">
              {(
                [
                  ['all', t('all', 'All')],
                  ['image', t('images', 'Images')],
                  ['video', t('video', 'Video')],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  data-media-tab={value}
                  onClick={() => setTab(value)}
                  className={clsx(
                    'h-[26px] rounded-[6px] px-[11px] text-[12.5px] transition-colors',
                    tab === value
                      ? 'bg-pqInner font-[600] text-pqText'
                      : 'font-[500] text-pqMuted hover:text-pqText'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="min-w-0 flex-1" />
            <div className="relative shrink-0">
              <SearchIcon />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('search_media_by_name', 'Search by file name')}
                className="h-[36px] w-[210px] rounded-pqSm bg-pqInner pe-[12px] ps-[31px] text-[13px] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)] mobile:w-[160px]"
              />
            </div>
            <div className="flex shrink-0 items-center gap-[2px] rounded-pqSm bg-pqSettings p-[3px]">
              <button
                type="button"
                data-media-view="grid"
                title={t('grid', 'Grid')}
                onClick={() => setView('grid')}
                className={clsx(
                  'grid h-[26px] w-[28px] place-items-center rounded-[6px]',
                  view === 'grid'
                    ? 'bg-pqInner text-pqText'
                    : 'bg-transparent text-pqSoft hover:text-pqText'
                )}
              >
                <GridIcon />
              </button>
              <button
                type="button"
                data-media-view="list"
                title={t('list', 'List')}
                onClick={() => setView('list')}
                className={clsx(
                  'grid h-[26px] w-[28px] place-items-center rounded-[6px]',
                  view === 'list'
                    ? 'bg-pqInner text-pqText'
                    : 'bg-transparent text-pqSoft hover:text-pqText'
                )}
              >
                <ListIcon />
              </button>
            </div>
            {brandUploadBtn}
            <ThirdPartyMediaLibrary onImported={() => mutate()} />
          </div>

          {uppyBar}

          <div className="min-h-0 flex-1 overflow-y-auto pe-[14px] pb-[28px] scrollbar scrollbar-thumb-pqBorder scrollbar-track-pqInner">
            {showEmptyState && (
              <div className="flex flex-col items-center gap-[11px] px-0 py-[70px] text-center">
                <span className="grid h-[46px] w-[46px] place-items-center rounded-[14px] bg-pqSettings text-pqSoft">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                    <path
                      d="M4.5 4.5h15A1.5 1.5 0 0 1 21 6v12a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V6a1.5 1.5 0 0 1 1.5-1.5Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M3.5 16.5 8 12l3.5 3 3-2.5L21 17"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div className="text-[15px] font-[600] text-pqText">
                  {t('nothing_here_yet', 'Nothing here yet')}
                </div>
                <div className="max-w-[360px] text-[13px] leading-[1.6] text-pqMuted">
                  {t(
                    'upload_images_or_video_or_drag',
                    'Upload images or video, or drag files straight onto this page. Up to 1 GB per upload.'
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => uploaderRef.current?.click()}
                  className="h-[34px] rounded-pqSm bg-pqBrand px-[14px] text-[13px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover"
                >
                  {t('upload_media', 'Upload media')}
                </button>
              </div>
            )}

            {emptyAfterFilter && (
              <div className="py-[40px] text-center text-[14px] text-pqMuted">
                {t('no_media_match_search', 'No media matches your search')}
              </div>
            )}

            {!showEmptyState && (
              <>
                <button
                  type="button"
                  onClick={() => uploaderRef.current?.click()}
                  className="mb-[18px] flex w-full cursor-pointer flex-col items-center justify-center gap-[10px] rounded-[16px] border-[1.5px] border-dashed border-pqBorder bg-pqBrandFaint px-[20px] py-[30px] font-inherit transition-colors hover:border-pqBrand hover:bg-pqBrandSoft"
                >
                  <span className="grid h-[48px] w-[48px] place-items-center rounded-[15px] bg-pqBrand text-pqOnBrand shadow-pqE2">
                    <svg viewBox="0 0 24 24" width="23" height="23" fill="none">
                      <path
                        d="M12 16V4M7.5 8.5 12 4l4.5 4.5M4 20h16"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="flex flex-col items-center gap-[4px]">
                    <span className="text-[15px] font-[600] text-pqText">
                      {t(
                        'drop_files_here_paste_or_browse',
                        'Drop files here, paste or browse'
                      )}
                    </span>
                    <span className="text-[12.5px] text-pqMuted">
                      {t(
                        'maximum_size_allowed_1gb_images_video',
                        'Maximum size allowed is 1 GB · images and video'
                      )}
                    </span>
                  </span>
                </button>

                <div className="flex items-baseline gap-[8px] px-[2px] pb-[10px]">
                  <span className="text-[10.5px] font-[600] uppercase tracking-[0.07em] text-pqSoft">
                    {sectionLabel}
                  </span>
                  <span className="text-[11px] font-[600] text-pqSoft opacity-75">
                    {visibleMedia.length}
                  </span>
                </div>

                {isLoading && page === 0 && (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-x-[14px] gap-y-[18px]">
                    {[...new Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="aspect-[4/3] animate-pulse rounded-[10px] bg-pqSettings"
                      />
                    ))}
                  </div>
                )}

                {view === 'grid' && (
                  <div
                    className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] items-start gap-x-[14px] gap-y-[18px]"
                    data-pq="media-grid"
                  >
                    {visibleMedia.map((media) => (
                      <div
                        key={media.id}
                        data-ci="1"
                        onClick={openLightbox(media)}
                        className="group flex cursor-pointer flex-col gap-[8px]"
                      >
                        <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[10px] bg-pqSettings outline outline-1 outline-pqBorder -outline-offset-1 transition-[outline-color] group-hover:outline-pqBrand">
                          <MediaThumb media={media} />
                          {isVideoMedia(media) && (
                            <span className="absolute bottom-[7px] end-[7px] flex h-[19px] items-center gap-[4px] rounded-[5px] bg-black/72 px-[6px] text-[10px] font-[600] tabular-nums text-white">
                              {media.duration || t('video', 'Video')}
                            </span>
                          )}
                          <div className="absolute top-[6px] end-[6px]">
                            <button
                              type="button"
                              onClick={openMenu(media)}
                              title={t('more', 'More')}
                              className="grid h-[28px] w-[28px] place-items-center rounded-[8px] bg-pqPop text-pqMuted shadow-pqE2 shadow-[inset_0_0_0_1px_var(--border)] hover:text-pqText"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                width="16"
                                height="16"
                                fill="none"
                              >
                                <path
                                  d="M12 6.5h.01M12 12h.01M12 17.5h.01"
                                  stroke="currentColor"
                                  strokeWidth="2.4"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-[2px] px-[2px]">
                          <span className="truncate text-[12.5px] font-[500] text-pqText">
                            {media.originalName || media.name}
                          </span>
                          <span className="text-[11px] text-pqSoft">
                            {formatMediaMeta(media)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {view === 'list' && (
                  <div className="flex flex-col" data-pq="media-list">
                    <div className="flex items-center gap-[12px] border-b border-pqLine px-[8px] pb-[9px] text-[11px] font-[600] uppercase tracking-[0.05em] text-pqSoft">
                      <span className="w-[36px] shrink-0" />
                      <span className="min-w-0 flex-1">{t('name', 'Name')}</span>
                      <span className="w-[110px] shrink-0">
                        {t('modified', 'Modified')}
                      </span>
                      <span className="w-[80px] shrink-0 text-end">
                        {t('size', 'Size')}
                      </span>
                      <span className="w-[36px] shrink-0" />
                    </div>
                    {visibleMedia.map((media) => (
                      <div
                        key={media.id}
                        data-media-row={media.id}
                        data-ci="1"
                        onClick={openLightbox(media)}
                        className="group flex cursor-pointer items-center gap-[12px] rounded-pqSm border-b border-pqLine p-[8px] hover:bg-pqHover"
                      >
                        <span className="grid h-[36px] w-[36px] shrink-0 place-items-center overflow-hidden rounded-[8px] bg-pqSettings outline outline-1 outline-pqBorder -outline-offset-1">
                          <MediaThumb media={media} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] text-pqText">
                          {media.originalName || media.name}
                        </span>
                        <span className="w-[110px] shrink-0 text-[12.5px] text-pqMuted">
                          {media.modified ||
                            (media.updatedAt
                              ? new Date(media.updatedAt).toLocaleDateString()
                              : '—')}
                        </span>
                        <span className="w-[80px] shrink-0 text-end text-[12.5px] tabular-nums text-pqMuted">
                          {media.fileSize && media.fileSize > 0
                            ? formatSize(media.fileSize)
                            : '—'}
                        </span>
                        <button
                          type="button"
                          onClick={openMenu(media)}
                          className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-[8px] bg-transparent text-pqSoft hover:bg-pqSettings hover:text-pqText"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="none"
                          >
                            <path
                              d="M12 6.5h.01M12 12h.01M12 17.5h.01"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {hasMorePages && (
                  <div className="flex flex-col items-center gap-[8px] px-0 pb-[4px] pt-[22px]">
                    <button
                      type="button"
                      onClick={() => setPage((p) => p + 1)}
                      className="flex h-[36px] items-center gap-[8px] rounded-pqSm bg-pqInner px-[18px] text-[13px] font-[600] text-pqText shadow-[inset_0_0_0_1px_var(--border)] hover:shadow-[inset_0_0_0_1px_var(--brand)]"
                    >
                      {t('show_more', 'Show more')}
                    </button>
                    <span className="text-[12px] text-pqSoft">
                      {t(
                        'showing_x_of_y_files',
                        'Showing {{shown}} of {{total}} files',
                        {
                          shown: visibleMedia.length,
                          total: totalCount,
                        }
                      )}
                    </span>
                  </div>
                )}
                {!hasMorePages && visibleMedia.length > 0 && page > 0 && (
                  <div className="flex flex-col items-center gap-[9px] px-0 pb-[4px] pt-[20px]">
                    <span className="text-[12px] text-pqSoft">
                      {t(
                        'showing_x_of_y_files',
                        'Showing {{shown}} of {{total}} files',
                        {
                          shown: visibleMedia.length,
                          total: totalCount,
                        }
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPage(0);
                        setAccumulated([]);
                      }}
                      className="flex h-[30px] items-center gap-[7px] rounded-pqSm bg-transparent px-[13px] text-[12.5px] font-[500] text-pqMuted shadow-[inset_0_0_0_1px_var(--border)] hover:bg-pqHover hover:text-pqText"
                    >
                      {t('show_less', 'Show less')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {menuMedia &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-[120]"
                onClick={() => setMenuMedia(null)}
              />
              <div
                ref={menuFloatingRef}
                className="z-[121] flex w-[200px] flex-col gap-[2px] rounded-[12px] bg-pqPop p-[6px] shadow-pqE3 shadow-[inset_0_0_0_1px_var(--border)]"
              >
                <button
                  type="button"
                  className="rounded-[8px] px-[10px] py-[8px] text-start text-[13px] text-pqText hover:bg-pqHover"
                  onClick={openLightbox(menuMedia)}
                >
                  {t('preview', 'Preview')}
                </button>
                <button
                  type="button"
                  className="rounded-[8px] px-[10px] py-[8px] text-start text-[13px] text-pqText hover:bg-pqHover"
                  onClick={() => {
                    downloadMedia(menuMedia)();
                    setMenuMedia(null);
                  }}
                >
                  {t('download', 'Download')}
                </button>
                <button
                  type="button"
                  className="rounded-[8px] px-[10px] py-[8px] text-start text-[13px] text-pqText hover:bg-pqHover"
                  onClick={openAltText(menuMedia)}
                >
                  {t('change_alt_text', 'Change alt text')}
                </button>
                <button
                  type="button"
                  className="rounded-[8px] px-[10px] py-[8px] text-start text-[13px] text-pqWarn hover:bg-pqHover"
                  onClick={deleteImage(menuMedia)}
                >
                  {t('delete', 'Delete')}
                </button>
              </div>
            </>,
            document.body
          )}

        {lightbox && (
          <MediaLightbox
            media={lightbox}
            onClose={() => setLightbox(null)}
            onDownload={downloadMedia(lightbox)}
            onDelete={
              lightbox.uiDemo ? undefined : () => deleteImage(lightbox)()
            }
          />
        )}
      </DropFiles>
    );
  }

  // --- Insert-media picker (composer library sheet) ------------------------
  return (
    <DropFiles
      disabled={loading}
      noClick
      className="flex flex-1 flex-col"
      onDrop={dragAndDrop}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-[16px] flex items-center gap-[8px]">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search_media_by_name', 'Search by file name')}
              className="h-[44px] w-full rounded-[10px] bg-pqBg px-[14px] text-[14px] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)]"
            />
          </div>
          {fileInput}
          <div className="flex gap-[8px]">
            {pickerUploadBtn}
            <ThirdPartyMediaLibrary onImported={() => mutate()} />
          </div>
        </div>
        {uppyBar}
        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0 overflow-y-auto scrollbar scrollbar-thumb-pqBorder scrollbar-track-pqInner">
            {isLoading && (
              <div className="grid grid-cols-6 gap-[8px] mobile:grid-cols-3">
                {[...new Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square animate-pulse rounded-[6px] bg-pqSettings"
                  />
                ))}
              </div>
            )}
            {!isLoading && visibleMedia.length === 0 && (
              <div className="flex flex-col items-center gap-[12px] py-[48px] text-center">
                <div className="text-[15px] font-[600] text-pqText">
                  {debouncedSearch
                    ? t('no_media_match_search', 'No media matches your search')
                    : t('nothing_here_yet', 'Nothing here yet')}
                </div>
                <button
                  type="button"
                  onClick={() => uploaderRef.current?.click()}
                  className="h-[34px] rounded-pqSm bg-pqBrand px-[14px] text-[13px] font-[600] text-pqOnBrand"
                >
                  {t('upload_media', 'Upload media')}
                </button>
              </div>
            )}
            <div className="grid grid-cols-6 gap-[8px] mobile:grid-cols-3 tablet:grid-cols-4">
              {visibleMedia.map((media) => {
                const position = selected.findIndex((z) => z.id === media.id);
                return (
                  <div
                    key={media.id}
                    onClick={addRemoveSelected(media)}
                    className={clsx(
                      'group relative aspect-square cursor-pointer rounded-[6px] border-4',
                      position > -1 ? 'border-pqBrand' : 'border-transparent'
                    )}
                  >
                    {position > -1 ? (
                      <div className="absolute -bottom-[10px] -end-[10px] z-[101] flex h-[24px] w-[24px] items-center justify-center rounded-full bg-pqBrand text-[14px] font-[500] text-pqOnBrand">
                        {position + 1}
                      </div>
                    ) : (
                      <DeleteCircleIcon
                        className="absolute -top-[5px] -end-[5px] z-[100] hidden cursor-pointer group-hover:block"
                        onClick={deleteImage(media)}
                      />
                    )}
                    <div className="relative h-full w-full overflow-hidden rounded-[6px] bg-pqTableHeader">
                      <button
                        type="button"
                        onClick={openLightbox(media)}
                        className="absolute end-[6px] top-[6px] z-[20] grid h-[28px] w-[28px] place-items-center rounded-[8px] bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label={t('preview', 'Preview')}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                        >
                          <path
                            d="M2 9H0V14H5V12H2V9ZM0 5H2V2H5V0H0V5ZM12 12H9V14H14V9H12V12ZM9 0V2H12V5H14V0H9Z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                      <MediaThumb media={media} />
                      <span className="absolute bottom-[6px] end-[6px] rounded-[4px] bg-black/40 px-[5px] py-[2px] text-[11px] text-white">
                        {media.originalName || media.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {(data?.pages || 0) > 1 && !useDemo && (
              <Pagination
                current={page}
                totalPages={data?.pages}
                setPage={setPage}
              />
            )}
          </div>
        </div>
        <div className="mt-[32px] flex justify-end gap-[8px]">
          <button
            type="button"
            onClick={() => modals.closeCurrent()}
            className="flex h-[44px] cursor-pointer items-center justify-center rounded-[10px] bg-transparent px-[18px] text-[14px] text-pqText shadow-[inset_0_0_0_1px_var(--border)]"
          >
            {t('cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={addMedia}
            disabled={selected.length === 0}
            className="flex h-[44px] cursor-pointer items-center justify-center rounded-[10px] bg-pqBrand px-[20px] text-[14px] text-pqOnBrand disabled:cursor-not-allowed disabled:opacity-80"
          >
            {t('add_selected_media', 'Add selected media')}
          </button>
        </div>
      </div>
      {lightbox && (
        <MediaLightbox
          media={lightbox}
          onClose={() => setLightbox(null)}
          onDownload={downloadMedia(lightbox)}
        />
      )}
    </DropFiles>
  );
};
