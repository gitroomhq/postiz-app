'use client';

import React, {
  ChangeEvent,
  ClipboardEvent,
  FC,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from '@gitroom/react/form/button';
import copy from 'copy-to-clipboard';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
import { Media } from '@prisma/client';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import EventEmitter from 'events';
import { useToaster } from '@gitroom/react/toaster/toaster';
import clsx from 'clsx';
import { VideoFrame } from '@gitroom/react/helpers/video.frame';
import { useUppyUploader } from '@gitroom/frontend/components/media/new.uploader';
import dynamic from 'next/dynamic';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { AiImage } from '@gitroom/frontend/components/launches/ai.image';
import { DropFiles } from '@gitroom/frontend/components/layout/drop.files';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { ThirdPartyMedia } from '@gitroom/frontend/components/third-parties/third-party.media';
import { ReactSortable } from 'react-sortablejs';
import { MediaComponentInner } from '@gitroom/frontend/components/launches/helpers/media.settings.component';
import { AiVideo } from '@gitroom/frontend/components/launches/ai.video';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { ThirdPartyMediaLibrary } from '@gitroom/frontend/components/third-parties/third-party.media-library';
import { Dashboard } from '@uppy/react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  DeleteCircleIcon,
  CloseCircleIcon,
  DragHandleIcon,
  MediaSettingsIcon,
  InsertMediaIcon,
  DesignMediaIcon,
  VerticalDividerIcon,
  NoMediaIcon,
  TrashIcon,
} from '@gitroom/frontend/components/ui/icons';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useDebounce } from 'use-debounce';
const Polonto = dynamic(
  () => import('@gitroom/frontend/components/launches/polonto')
);
const showModalEmitter = new EventEmitter();
// on phones the media library takes the whole screen
export const mediaLibrarySize = () =>
  window.matchMedia('(max-width: 1025px)').matches
    ? '100%'
    : 'calc(100% - 80px)';
export const Pagination: FC<{
  current: number;
  totalPages: number;
  setPage: (num: number) => void;
}> = (props) => {
  const t = useT();

  const { current, totalPages, setPage } = props;

  const paginationItems = useMemo(() => {
    // Convert to 1-based for algorithm (current is 0-based)
    const c = current + 1;
    const m = totalPages;

    // If total pages <= 10, show all pages
    if (m <= 10) {
      return Array.from({ length: m }, (_, i) => i + 1);
    }

    const delta = 3;
    const left = c - delta;
    const right = c + delta + 1;
    const range: number[] = [];
    const rangeWithDots: (number | '...')[] = [];
    let l: number | undefined;

    // Build the range of pages to show
    for (let i = 1; i <= m; i++) {
      if (i === 1 || i === m || (i >= left && i < right)) {
        range.push(i);
      }
    }

    // Add dots where there are gaps
    for (const i of range) {
      if (l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    // Limit to maximum 10 items by trimming pages near edges if needed
    while (rangeWithDots.length > 10) {
      const currentIndex = rangeWithDots.findIndex((item) => item === c);
      if (currentIndex !== -1 && currentIndex > rangeWithDots.length / 2) {
        // Current is in second half, remove one item from start side
        rangeWithDots.splice(2, 1);
      } else {
        // Current is in first half, remove one item from end side
        rangeWithDots.splice(-3, 1);
      }
    }

    return rangeWithDots;
  }, [current, totalPages]);

  return (
    <ul className="flex flex-row flex-wrap items-center gap-1 justify-center mt-[15px]">
      <li className={clsx(current === 0 && 'opacity-20 pointer-events-none')}>
        <div
          className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 py-2 gap-1 ps-2.5 text-gray-400 hover:text-white border-[#1F1F1F] hover:bg-forth"
          aria-label="Go to previous page"
          onClick={() => setPage(current - 1)}
        >
          <ChevronLeftIcon className="lucide lucide-chevron-left h-4 w-4" />
          <span className="mobile:hidden">{t('previous', 'Previous')}</span>
        </div>
      </li>
      {paginationItems.map((item, index) => (
        // phones show "2 / 6" instead of the page numbers
        <li key={index} className="mobile:hidden">
          {item === '...' ? (
            <span className="inline-flex items-center justify-center h-10 w-10 text-textColor select-none">
              ...
            </span>
          ) : (
            <div
              aria-current="page"
              onClick={() => setPage(item - 1)}
              className={clsx(
                'cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border hover:bg-forth h-10 w-10 hover:text-white border-newBorder',
                current === item - 1
                  ? 'bg-forth !text-white'
                  : 'text-textColor hover:text-white'
              )}
            >
              {item}
            </div>
          )}
        </li>
      ))}
      <li className="hidden mobile:flex h-10 items-center px-[8px] text-[14px] text-textColor">
        {current + 1} / {totalPages}
      </li>
      <li
        className={clsx(
          current + 1 === totalPages && 'opacity-20 pointer-events-none'
        )}
      >
        <a
          className="text-textColor hover:text-white group cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 py-2 gap-1 pe-2.5 text-gray-400 border-[#1F1F1F] hover:bg-forth"
          aria-label="Go to next page"
          onClick={() => setPage(current + 1)}
        >
          <span className="mobile:hidden">{t('next', 'Next')}</span>
          <ChevronRightIcon className="lucide lucide-chevron-right h-4 w-4" />
        </a>
      </li>
    </ul>
  );
};
export const ShowMediaBoxModal: FC = () => {
  const modals = useModals();
  const t = useT();
  useEffect(() => {
    showModalEmitter.on('show-modal', (cCallback) => {
      modals.openModal({
        title: t('media_library', 'Media Library'),
        askClose: false,
        closeOnEscape: true,
        fullScreen: true,
        size: mediaLibrarySize(),
        height: mediaLibrarySize(),
        children: (close) => (
          <MediaBox
            setMedia={(media) => cCallback(media[0])}
            closeModal={close}
          />
        ),
      });
    });
    return () => {
      showModalEmitter.removeAllListeners('show-modal');
    };
  }, []);
  return null;
};
export const showMediaBox = (
  callback: (params: { id: string; path: string }) => void
) => {
  showModalEmitter.emit('show-modal', callback);
};
const CHUNK_SIZE = 1024 * 1024;
const MAX_UPLOAD_SIZE = 1024 * 1024 * 1024; // 1 GB
export const MediaBox: FC<{
  setMedia: (params: { id: string; path: string }[]) => void;
  standalone?: boolean;
  type?: 'image' | 'image-static' | 'video';
  closeModal: () => void;
}> = ({ type, standalone, setMedia }) => {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);
  const fetch = useFetch();
  const modals = useModals();
  const toaster = useToaster();
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);
  const loadMedia = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page + 1) });
    if (debouncedSearch.trim()) {
      params.set('search', debouncedSearch.trim());
    }
    return (await fetch(`/media?${params.toString()}`)).json();
  }, [page, debouncedSearch]);
  const { data, mutate, isLoading } = useSWR(
    `get-media-${page}-${debouncedSearch}`,
    loadMedia
  );
  const [selected, setSelected] = useState([]);
  const t = useT();
  const uploaderRef = useRef<any>(null);
  const mediaDirectory = useMediaDirectory();
  const [loading, setLoading] = useState(false);

  const [viewMode, setViewMode] = useState<'grid' | 'large' | 'list' | 'compact'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [sortBy, setSortBy] = useState<
    'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc'
  >('newest');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('media-view-mode') as any;
      if (saved && ['grid', 'large', 'list', 'compact'].includes(saved)) {
        setViewMode(saved);
      }
    } catch (e) {}
  }, []);

  const changeViewMode = useCallback(
    (mode: 'grid' | 'large' | 'list' | 'compact') => {
      setViewMode(mode);
      try {
        localStorage.setItem('media-view-mode', mode);
      } catch (e) {}
    },
    []
  );

  const formatBytes = useCallback((bytes?: number) => {
    if (!bytes || bytes <= 0) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  const formatDate = useCallback((dateStr?: string | Date) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return '—';
    }
  }, []);

  const handleCopyLink = useCallback(
    (media: any) => (e: any) => {
      e.stopPropagation();
      const fullUrl = mediaDirectory.set(media.path);
      copy(fullUrl);
      toaster.show(t('link_copied', 'Link copied to clipboard!'), 'success');
    },
    [mediaDirectory, toaster, t]
  );

  const handleDownload = useCallback(
    (media: any) => (e: any) => {
      e.stopPropagation();
      const url = mediaDirectory.set(media.path);
      const a = document.createElement('a');
      a.href = url;
      a.download = media.originalName || media.name || 'download';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    [mediaDirectory]
  );

  const uppy = useUppyUploader({
    allowedFileTypes:
      type == 'image'
        ? 'image/*'
        : type == 'image-static'
        ? 'image/jpeg,image/png'
        : type == 'video'
        ? 'video/mp4'
        : 'image/*,video/mp4',
    onUploadSuccess: async (arr) => {
      await mutate();
      if (standalone) {
        return;
      }
      setSelected((prevSelected) => {
        return [...prevSelected, ...arr];
      });
    },
    onStart: () => setLoading(true),
    onEnd: () => setLoading(false),
  });

  // uploader messages (errors, processing warnings) stay after the upload ends
  const [uploadInfo, setUploadInfo] = useState(false);
  useEffect(() => {
    const show = () => setUploadInfo(true);
    const hide = () => setUploadInfo(false);
    uppy.on('info-visible', show);
    uppy.on('info-hidden', hide);
    return () => {
      uppy.off('info-visible', show);
      uppy.off('info-hidden', hide);
    };
  }, [uppy]);

  const addRemoveSelected = useCallback(
    (media: any) => () => {
      if (standalone) {
        return;
      }
      const exists = selected.find((p: any) => p.id === media.id);
      if (exists) {
        setSelected(selected.filter((f: any) => f.id !== media.id));
        return;
      }
      setSelected([...selected, media]);
    },
    [selected]
  );

  const addMedia = useCallback(async () => {
    if (standalone) {
      return;
    }
    // @ts-ignore
    setMedia(selected);
    modals.closeCurrent();
  }, [selected]);

  const addToUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
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

      // @ts-ignore
      uppy.addFiles(files);
    },
    [toaster, t]
  );

  const dragAndDrop = useCallback(
    async (event: ClipboardEvent<HTMLDivElement> | File[]) => {
      // @ts-ignore
      const clipboardItems = event.map((p) => ({
        kind: 'file',
        getAsFile: () => p,
      }));
      if (!clipboardItems) {
        return;
      }

      const files: File[] = [];
      // @ts-ignore
      for (const item of clipboardItems) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

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
    [toaster, t]
  );

  const maximize = useCallback(
    (media: Media) => async (e: any) => {
      e.stopPropagation();
      modals.openModal({
        title: '',
        top: 10,
        children: (
          <div className="w-full h-full p-[50px]">
            {hasExtension(media.path, 'mp4') ? (
              <VideoFrame
                autoplay={true}
                url={mediaDirectory.set(media.path)}
              />
            ) : (
              <img
                width="100%"
                height="100%"
                className="w-full h-full max-h-[100%] max-w-[100%] object-cover"
                src={mediaDirectory.set(media.path)}
                alt="media"
              />
            )}
          </div>
        ),
      });
    },
    []
  );

  const deleteImage = useCallback(
    (media: Media) => async (e: any) => {
      e.stopPropagation();
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
      await fetch(`/media/${media.id}`, {
        method: 'DELETE',
      });
      mutate();
    },
    [mutate]
  );

  // phones have no hover, so the selected media are deleted together
  const deleteSelected = useCallback(async () => {
    if (
      !(await deleteDialog(
        t(
          'are_you_sure_you_want_to_delete_selected_media',
          'Are you sure you want to delete the selected media?'
        )
      ))
    ) {
      return;
    }
    const toDelete = selected;
    setSelected([]);
    try {
      await Promise.all(
        toDelete.map((media: any) =>
          fetch(`/media/${media.id}`, {
            method: 'DELETE',
          })
        )
      );
    } finally {
      const result = await mutate();
      // deleting a whole last page leaves nothing to show there
      if (page >= (result?.pages || 1)) {
        setPage(Math.max(0, (result?.pages || 1) - 1));
      }
    }
  }, [selected, mutate, page, t]);

  const btn = useMemo(() => {
    return (
      <button
        disabled={loading}
        onClick={() => uploaderRef?.current?.click()}
        className="relative cursor-pointer bg-btnSimple changeColor flex gap-[8px] h-[44px] px-[18px] justify-center items-center rounded-[8px]"
      >
        {loading ? (
          <div className="absolute left-[50%] top-[50%] -translate-y-[50%] -translate-x-[50%]">
            <div className="animate-spin h-[20px] w-[20px] border-4 border-white border-t-transparent rounded-full" />
          </div>
        ) : (
          <PlusIcon size={14} />
        )}
        <div className={loading ? 'invisible' : undefined}>{t('upload', 'Upload')}</div>
      </button>
    );
  }, [t, loading]);

  const processedMedia = useMemo(() => {
    if (!data?.results?.length) return [];
    let list = [...data.results];

    // Filter by type prop (modal constraint)
    if (type === 'video') {
      list = list.filter((f: any) => hasExtension(f.path, 'mp4') || f.type === 'video');
    } else if (type === 'image') {
      list = list.filter((f: any) => !hasExtension(f.path, 'mp4') && f.type !== 'video');
    } else if (type === 'image-static') {
      list = list.filter((f: any) => ['jpg', 'jpeg', 'png'].some((ext) => hasExtension(f.path, ext)));
    }

    // Filter by interactive filterType tab (if not constrained by type prop)
    if (!type) {
      if (filterType === 'video') {
        list = list.filter((f: any) => hasExtension(f.path, 'mp4') || f.type === 'video');
      } else if (filterType === 'image') {
        list = list.filter((f: any) => !hasExtension(f.path, 'mp4') && f.type !== 'video');
      }
    }

    // Sort
    list.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'name-asc':
          return (a.originalName || a.name || '').localeCompare(b.originalName || b.name || '');
        case 'name-desc':
          return (b.originalName || b.name || '').localeCompare(a.originalName || a.name || '');
        case 'size-desc':
          return (b.fileSize || 0) - (a.fileSize || 0);
        case 'size-asc':
          return (a.fileSize || 0) - (b.fileSize || 0);
        case 'newest':
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });

    return list;
  }, [data?.results, type, filterType, sortBy]);

  return (
    <DropFiles disabled={loading} className="flex flex-col flex-1" onDrop={dragAndDrop}>
      <div className="flex flex-col flex-1">
        <div
          className={clsx(
            'flex flex-col gap-[10px] mb-[12px]',
            !isLoading &&
              !data?.results?.length &&
              !debouncedSearch &&
              'hidden'
          )}
        >
          {/* Top row: Search, Upload, Third Party */}
          <div className="flex items-center gap-[12px] mobile:flex-wrap">
            <div className="flex-1 mobile:basis-full relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('search_media_by_name', 'Search by file name')}
                className="w-full h-[42px] px-[14px] rounded-[8px] bg-newBgColorInner border border-newColColor text-[14px] outline-none focus:border-[#612BD3]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-[12px] top-[50%] -translate-y-[50%] text-textColor/50 hover:text-textColor text-[13px]"
                >
                  ✕
                </button>
              )}
            </div>
            <input
              type="file"
              ref={uploaderRef}
              onChange={addToUpload}
              className="hidden"
              multiple={true}
            />
            <div className={clsx('flex gap-[8px]', !standalone && 'mobile:hidden')}>
              {btn}
              <ThirdPartyMediaLibrary onImported={() => mutate()} />
            </div>
          </div>

          {/* Sub row: Filters, Sort, View Modes */}
          <div className="flex items-center justify-between gap-[8px] flex-wrap text-[13px]">
            <div className="flex items-center gap-[8px] flex-wrap">
              {/* Type filter tabs (All / Images / Videos) */}
              {!type && (
                <div className="flex items-center bg-newBgColorInner border border-newColColor rounded-[8px] p-[2px]">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={clsx(
                      'px-[10px] py-[5px] rounded-[6px] font-[500] text-[12px] transition-colors',
                      filterType === 'all'
                        ? 'bg-[#612BD3] text-white shadow-sm'
                        : 'text-textColor/70 hover:text-textColor'
                    )}
                  >
                    {t('filter_all', 'All')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('image')}
                    className={clsx(
                      'px-[10px] py-[5px] rounded-[6px] font-[500] text-[12px] transition-colors',
                      filterType === 'image'
                        ? 'bg-[#612BD3] text-white shadow-sm'
                        : 'text-textColor/70 hover:text-textColor'
                    )}
                  >
                    {t('filter_images', 'Images')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('video')}
                    className={clsx(
                      'px-[10px] py-[5px] rounded-[6px] font-[500] text-[12px] transition-colors',
                      filterType === 'video'
                        ? 'bg-[#612BD3] text-white shadow-sm'
                        : 'text-textColor/70 hover:text-textColor'
                    )}
                  >
                    {t('filter_videos', 'Videos')}
                  </button>
                </div>
              )}

              {/* Sort dropdown */}
              <div className="flex items-center gap-[6px]">
                <span className="text-textColor/60 text-[12px] hidden sm:inline">
                  {t('sort_by', 'Sort by')}:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-[34px] px-[10px] rounded-[8px] bg-newBgColorInner border border-newColColor text-textColor text-[12px] outline-none cursor-pointer focus:border-[#612BD3]"
                >
                  <option value="newest">{t('sort_newest', 'Newest')}</option>
                  <option value="oldest">{t('sort_oldest', 'Oldest')}</option>
                  <option value="name-asc">{t('sort_name_asc', 'Name (A-Z)')}</option>
                  <option value="name-desc">{t('sort_name_desc', 'Name (Z-A)')}</option>
                  <option value="size-desc">{t('sort_size_desc', 'Size (Largest)')}</option>
                  <option value="size-asc">{t('sort_size_asc', 'Size (Smallest)')}</option>
                </select>
              </div>

              {/* Counter */}
              {processedMedia.length > 0 && (
                <span className="text-textColor/50 text-[12px] hidden md:inline">
                  {t('media_count', `${processedMedia.length} media files`, { count: processedMedia.length })}
                </span>
              )}
            </div>

            {/* Right side: View Mode switcher & Selection indicator */}
            <div className="flex items-center gap-[8px]">
              {/* View Switcher button group */}
              <div className="flex items-center bg-newBgColorInner border border-newColColor rounded-[8px] p-[2px]">
                <button
                  type="button"
                  title={t('view_grid', 'Grid')}
                  onClick={() => changeViewMode('grid')}
                  className={clsx(
                    'p-[6px] rounded-[6px] transition-colors',
                    viewMode === 'grid'
                      ? 'bg-[#612BD3] text-white shadow-sm'
                      : 'text-textColor/60 hover:text-textColor hover:bg-newTextColor/5'
                  )}
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="1" y="1" width="6" height="6" rx="1.5" />
                    <rect x="9" y="1" width="6" height="6" rx="1.5" />
                    <rect x="1" y="9" width="6" height="6" rx="1.5" />
                    <rect x="9" y="9" width="6" height="6" rx="1.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  title={t('view_large', 'Large Cards')}
                  onClick={() => changeViewMode('large')}
                  className={clsx(
                    'p-[6px] rounded-[6px] transition-colors',
                    viewMode === 'large'
                      ? 'bg-[#612BD3] text-white shadow-sm'
                      : 'text-textColor/60 hover:text-textColor hover:bg-newTextColor/5'
                  )}
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="1" y="2" width="14" height="5" rx="1.5" />
                    <rect x="1" y="9" width="14" height="5" rx="1.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  title={t('view_list', 'Detailed List')}
                  onClick={() => changeViewMode('list')}
                  className={clsx(
                    'p-[6px] rounded-[6px] transition-colors',
                    viewMode === 'list'
                      ? 'bg-[#612BD3] text-white shadow-sm'
                      : 'text-textColor/60 hover:text-textColor hover:bg-newTextColor/5'
                  )}
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="1" y="2" width="3" height="3" rx="0.8" />
                    <rect x="6" y="2.5" width="9" height="2" rx="1" />
                    <rect x="1" y="7" width="3" height="3" rx="0.8" />
                    <rect x="6" y="7.5" width="9" height="2" rx="1" />
                    <rect x="1" y="12" width="3" height="3" rx="0.8" />
                    <rect x="6" y="12.5" width="9" height="2" rx="1" />
                  </svg>
                </button>
                <button
                  type="button"
                  title={t('view_compact', 'Compact Grid')}
                  onClick={() => changeViewMode('compact')}
                  className={clsx(
                    'p-[6px] rounded-[6px] transition-colors',
                    viewMode === 'compact'
                      ? 'bg-[#612BD3] text-white shadow-sm'
                      : 'text-textColor/60 hover:text-textColor hover:bg-newTextColor/5'
                  )}
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="1" y="1" width="3.5" height="3.5" rx="0.8" />
                    <rect x="6.25" y="1" width="3.5" height="3.5" rx="0.8" />
                    <rect x="11.5" y="1" width="3.5" height="3.5" rx="0.8" />
                    <rect x="1" y="6.25" width="3.5" height="3.5" rx="0.8" />
                    <rect x="6.25" y="6.25" width="3.5" height="3.5" rx="0.8" />
                    <rect x="11.5" y="6.25" width="3.5" height="3.5" rx="0.8" />
                    <rect x="1" y="11.5" width="3.5" height="3.5" rx="0.8" />
                    <rect x="6.25" y="11.5" width="3.5" height="3.5" rx="0.8" />
                    <rect x="11.5" y="11.5" width="3.5" height="3.5" rx="0.8" />
                  </svg>
                </button>
              </div>

              {/* Delete selected */}
              {!!selected.length && (
                <div
                  onClick={deleteSelected}
                  className="flex items-center gap-[6px] text-[13px] font-[600] text-[#FF3F3F] cursor-pointer select-none px-[8px] py-[4px] rounded-[6px] hover:bg-red-500/10"
                >
                  <TrashIcon size={16} />
                  {t('delete_selected', 'Delete Selected')} ({selected.length})
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className={clsx(
            'w-full pointer-events-none relative mt-[5px] mb-[5px]',
            // phones only keep the upload progress while there is something to show
            !loading && !uploadInfo && 'mobile:hidden'
          )}
        >
          <div className="w-full h-[46px] overflow-hidden absolute left-0 bg-newBgColorInner uppyChange">
            <Dashboard
              height={46}
              uppy={uppy}
              id={`uploader`}
              showProgressDetails={true}
              hideUploadButton={true}
              hideRetryButton={true}
              hidePauseResumeButton={true}
              hideCancelButton={true}
              hideProgressAfterFinish={true}
            />
          </div>
          <div className="w-full h-[46px] uppyChange" />
        </div>

        <div
          className={clsx(
            'flex-1 relative',
            !isLoading &&
              !data?.results?.length &&
              'bg-newTextColor/[0.02] rounded-[12px]'
          )}
        >
          <div
            className={clsx(
              'absolute inset-0 h-full overflow-x-hidden overflow-y-auto scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner',
              !isLoading &&
                !data?.results?.length &&
                'flex justify-center items-center gap-[20px] flex-col'
            )}
          >
            {/* Empty state: No media at all */}
            {!isLoading && !data?.results?.length && (
              <>
                <NoMediaIcon />
                <div className="text-[20px] font-[600]">
                  {debouncedSearch
                    ? t(
                        'no_media_match_search',
                        'No media matches your search'
                      )
                    : t(
                        'you_dont_have_any_media_yet',
                        "You don't have any media yet"
                      )}
                </div>
                <div className="whitespace-pre-line text-newTextColor/[0.6] text-center">
                  {t(
                    'select_or_upload_pictures_max_1gb',
                    'Select or upload pictures (maximum 1 GB per upload).'
                  )}{' '}
                  {'\n'}
                  {t(
                    'you_can_drag_drop_pictures',
                    'You can also drag & drop pictures.'
                  )}
                </div>
                <div className="forceChange flex gap-[8px] mobile:w-full mobile:max-w-[300px] mobile:child:flex-1">
                  {btn}
                  <ThirdPartyMediaLibrary onImported={() => mutate()} />
                </div>
              </>
            )}

            {/* Empty state: filter produced 0 results */}
            {!isLoading && !!data?.results?.length && !processedMedia.length && (
              <div className="flex justify-center items-center gap-[12px] flex-col py-[60px] h-full">
                <NoMediaIcon />
                <div className="text-[17px] font-[600] text-textColor">
                  {t('no_media_match_filter', 'No media matches your current filter')}
                </div>
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className="px-[14px] py-[6px] rounded-[6px] bg-[#612BD3] text-white text-[13px] font-[500]"
                >
                  {t('filter_all', 'All')}
                </button>
              </div>
            )}

            {/* Loading Skeleton */}
            {isLoading && (
              <div
                className={clsx(
                  'p-[4px] w-full',
                  viewMode === 'large'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]'
                    : viewMode === 'list'
                    ? 'flex flex-col gap-[8px]'
                    : viewMode === 'compact'
                    ? 'grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-10 gap-[6px]'
                    : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-[10px]'
                )}
              >
                {[...new Array(viewMode === 'large' ? 6 : viewMode === 'list' ? 8 : 12)].map(
                  (_, i) => (
                    <div
                      className={clsx(
                        'rounded-[8px] bg-newSep animate-pulse',
                        viewMode === 'large'
                          ? 'aspect-[16/11]'
                          : viewMode === 'list'
                          ? 'h-[56px] w-full'
                          : 'aspect-square'
                      )}
                      key={i}
                    />
                  )
                )}
              </div>
            )}

            {/* Mode 1: Standard Balanced Grid */}
            {!isLoading && viewMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-[10px] p-[2px]">
                {processedMedia.map((media: any) => {
                  const isSelected = !!selected.find((p: any) => p.id === media.id);
                  const selectIdx = selected.findIndex((z: any) => z.id === media.id);
                  const isVideo = hasExtension(media.path, 'mp4') || media.type === 'video';
                  const ext =
                    media.path.split('.').pop()?.toUpperCase() || (isVideo ? 'MP4' : 'IMG');
                  return (
                    <div
                      key={media.id}
                      onClick={addRemoveSelected(media)}
                      className={clsx(
                        'group relative aspect-square rounded-[8px] overflow-hidden border-2 transition-all bg-newBgColorInner select-none',
                        isSelected
                          ? 'border-[#612BD3] ring-2 ring-[#612BD3]/30'
                          : 'border-newTableBorder hover:border-textColor/30',
                        !standalone && 'cursor-pointer'
                      )}
                    >
                      {/* Selection badge */}
                      {isSelected ? (
                        <div className="text-white flex z-[101] justify-center items-center text-[12px] font-[600] w-[24px] h-[24px] rounded-full bg-[#612BD3] absolute top-[8px] right-[8px] shadow">
                          {selectIdx + 1}
                        </div>
                      ) : (
                        /* Hover Action Overlay */
                        <div className="absolute top-[6px] right-[6px] z-[100] hidden group-hover:flex items-center gap-[4px] bg-black/75 backdrop-blur-sm rounded-[6px] p-[3px]">
                          <button
                            type="button"
                            title={t('zoom', 'Zoom')}
                            onClick={maximize(media)}
                            className="p-[4px] text-white/80 hover:text-white rounded hover:bg-white/20 transition-all"
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="11" cy="11" r="8" />
                              <line x1="21" y1="21" x2="16.65" y2="16.65" />
                              <line x1="11" y1="8" x2="11" y2="14" />
                              <line x1="8" y1="11" x2="14" y2="11" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            title={t('copy_link', 'Copy link')}
                            onClick={handleCopyLink(media)}
                            className="p-[4px] text-white/80 hover:text-white rounded hover:bg-white/20 transition-all"
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            title={t('download', 'Download')}
                            onClick={handleDownload(media)}
                            className="p-[4px] text-white/80 hover:text-white rounded hover:bg-white/20 transition-all"
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            title={t('delete', 'Delete')}
                            onClick={deleteImage(media)}
                            className="p-[4px] text-red-400 hover:text-red-300 rounded hover:bg-red-500/20 transition-all"
                          >
                            <TrashIcon size={13} />
                          </button>
                        </div>
                      )}

                      {/* Media Preview */}
                      <div className="w-full h-full relative">
                        {isVideo ? (
                          <VideoFrame url={mediaDirectory.set(media.path)} />
                        ) : (
                          <img
                            width="100%"
                            height="100%"
                            className="w-full h-full object-cover"
                            src={mediaDirectory.set(media.path)}
                            alt={media.originalName || 'media'}
                          />
                        )}
                      </div>

                      {/* Bottom Filename & Info Strip */}
                      <div className="absolute bottom-0 inset-x-0 z-[90] p-[6px] bg-gradient-to-t from-black/85 via-black/50 to-transparent flex flex-col gap-[2px]">
                        <div className="text-white text-[11px] font-[500] truncate leading-tight">
                          {media.originalName || media.name}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-white/70">
                          <span className="font-mono bg-white/20 px-[4px] py-[1px] rounded text-[9px] uppercase">
                            {ext}
                          </span>
                          <span>{formatBytes(media.fileSize)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mode 2: Large Cards with Full Metadata */}
            {!isLoading && viewMode === 'large' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px] p-[2px]">
                {processedMedia.map((media: any) => {
                  const isSelected = !!selected.find((p: any) => p.id === media.id);
                  const selectIdx = selected.findIndex((z: any) => z.id === media.id);
                  const isVideo = hasExtension(media.path, 'mp4') || media.type === 'video';
                  const ext =
                    media.path.split('.').pop()?.toUpperCase() || (isVideo ? 'MP4' : 'IMG');
                  return (
                    <div
                      key={media.id}
                      onClick={addRemoveSelected(media)}
                      className={clsx(
                        'group flex flex-col rounded-[10px] overflow-hidden border transition-all bg-newBgColorInner select-none',
                        isSelected
                          ? 'border-[#612BD3] ring-2 ring-[#612BD3]/30'
                          : 'border-newTableBorder hover:border-textColor/30',
                        !standalone && 'cursor-pointer'
                      )}
                    >
                      {/* Large Preview */}
                      <div className="w-full aspect-[16/10] relative overflow-hidden bg-black/10">
                        {isVideo ? (
                          <VideoFrame url={mediaDirectory.set(media.path)} />
                        ) : (
                          <img
                            width="100%"
                            height="100%"
                            className="w-full h-full object-cover"
                            src={mediaDirectory.set(media.path)}
                            alt={media.originalName || 'media'}
                          />
                        )}

                        {/* Top badges */}
                        <div className="absolute top-[8px] left-[8px] z-[90] flex items-center gap-[6px]">
                          <span className="font-mono bg-black/75 backdrop-blur-sm text-white px-[6px] py-[2px] rounded text-[10px] uppercase font-semibold">
                            {ext}
                          </span>
                          {media.fileSize && (
                            <span className="bg-black/65 backdrop-blur-sm text-white/90 px-[6px] py-[2px] rounded text-[10px]">
                              {formatBytes(media.fileSize)}
                            </span>
                          )}
                        </div>

                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="text-white flex z-[101] justify-center items-center text-[12px] font-[600] w-[26px] h-[26px] rounded-full bg-[#612BD3] absolute top-[8px] right-[8px] shadow">
                            {selectIdx + 1}
                          </div>
                        )}

                        {/* Center Zoom Icon on hover */}
                        <div
                          onClick={maximize(media)}
                          className="absolute inset-0 z-[80] bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                        >
                          <div className="p-[10px] bg-black/70 text-white rounded-full hover:scale-110 transition-transform">
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="11" cy="11" r="8" />
                              <line x1="21" y1="21" x2="16.65" y2="16.65" />
                              <line x1="11" y1="8" x2="11" y2="14" />
                              <line x1="8" y1="11" x2="14" y2="11" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Metadata & Actions */}
                      <div className="p-[12px] flex flex-col gap-[8px]">
                        <div className="flex items-start justify-between gap-[8px]">
                          <div
                            className="text-[13px] font-[600] text-textColor truncate flex-1"
                            title={media.originalName || media.name}
                          >
                            {media.originalName || media.name}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-textColor/60">
                          <span>
                            {t('uploaded_at', 'Uploaded')}: {formatDate(media.createdAt)}
                          </span>
                          <span>{formatBytes(media.fileSize)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-[8px] border-t border-newTableBorder gap-[6px]">
                          <div className="flex items-center gap-[6px]">
                            <button
                              type="button"
                              onClick={handleCopyLink(media)}
                              className="px-[8px] py-[4px] text-[11px] rounded-[6px] bg-newTextColor/[0.05] hover:bg-newTextColor/[0.1] text-textColor flex items-center gap-[4px] transition-colors"
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                              </svg>
                              {t('copy_link', 'Copy link')}
                            </button>
                            <button
                              type="button"
                              onClick={handleDownload(media)}
                              className="px-[8px] py-[4px] text-[11px] rounded-[6px] bg-newTextColor/[0.05] hover:bg-newTextColor/[0.1] text-textColor flex items-center gap-[4px] transition-colors"
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                              {t('download', 'Download')}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={deleteImage(media)}
                            className="p-[5px] text-red-500 hover:bg-red-500/10 rounded-[6px] transition-colors"
                            title={t('delete', 'Delete')}
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mode 3: Detailed List / Table View */}
            {!isLoading && viewMode === 'list' && (
              <div className="flex flex-col gap-[6px] p-[2px]">
                {/* Table Header */}
                <div className="flex items-center px-[12px] py-[8px] text-[11px] font-[600] text-textColor/60 uppercase tracking-wider border-b border-newTableBorder">
                  <div className="w-[50px]">{t('preview', 'Preview')}</div>
                  <div className="flex-1 min-w-0 px-[12px]">{t('file_name', 'File Name')}</div>
                  <div className="w-[80px] text-center">{t('file_format', 'Format')}</div>
                  <div className="w-[90px] text-right">{t('file_size', 'Size')}</div>
                  <div className="w-[120px] text-right mobile:hidden">{t('uploaded_at', 'Uploaded')}</div>
                  <div className="w-[120px] text-right">{t('actions', 'Actions')}</div>
                </div>

                {/* Table Rows */}
                {processedMedia.map((media: any) => {
                  const isSelected = !!selected.find((p: any) => p.id === media.id);
                  const selectIdx = selected.findIndex((z: any) => z.id === media.id);
                  const isVideo = hasExtension(media.path, 'mp4') || media.type === 'video';
                  const ext =
                    media.path.split('.').pop()?.toUpperCase() || (isVideo ? 'MP4' : 'IMG');
                  return (
                    <div
                      key={media.id}
                      onClick={addRemoveSelected(media)}
                      className={clsx(
                        'group flex items-center px-[12px] py-[8px] rounded-[8px] border transition-all bg-newBgColorInner select-none',
                        isSelected
                          ? 'border-[#612BD3] ring-1 ring-[#612BD3]/30 bg-[#612BD3]/5'
                          : 'border-newTableBorder hover:bg-newTextColor/[0.03]',
                        !standalone && 'cursor-pointer'
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="w-[44px] h-[44px] rounded-[6px] overflow-hidden flex-shrink-0 relative bg-black/10">
                        {isVideo ? (
                          <VideoFrame url={mediaDirectory.set(media.path)} />
                        ) : (
                          <img
                            width="100%"
                            height="100%"
                            className="w-full h-full object-cover"
                            src={mediaDirectory.set(media.path)}
                            alt="media"
                          />
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-[#612BD3]/80 flex items-center justify-center text-white text-[12px] font-bold">
                            {selectIdx + 1}
                          </div>
                        )}
                      </div>

                      {/* File name */}
                      <div className="flex-1 min-w-0 px-[12px]">
                        <div
                          className="text-[13px] font-[500] text-textColor truncate"
                          title={media.originalName || media.name}
                        >
                          {media.originalName || media.name}
                        </div>
                        <div className="text-[11px] text-textColor/50 truncate">
                          {media.name}
                        </div>
                      </div>

                      {/* Format badge */}
                      <div className="w-[80px] text-center">
                        <span className="px-[6px] py-[2px] rounded font-mono text-[10px] uppercase font-semibold bg-newTextColor/[0.06] text-textColor/80">
                          {ext}
                        </span>
                      </div>

                      {/* File size */}
                      <div className="w-[90px] text-right text-[12px] text-textColor/70 font-mono">
                        {formatBytes(media.fileSize)}
                      </div>

                      {/* Upload date */}
                      <div className="w-[120px] text-right text-[12px] text-textColor/60 mobile:hidden">
                        {formatDate(media.createdAt)}
                      </div>

                      {/* Action buttons */}
                      <div className="w-[120px] flex items-center justify-end gap-[4px]">
                        <button
                          type="button"
                          title={t('zoom', 'Zoom')}
                          onClick={maximize(media)}
                          className="p-[6px] text-textColor/60 hover:text-textColor hover:bg-newTextColor/[0.08] rounded-[6px] transition-colors"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            <line x1="11" y1="8" x2="11" y2="14" />
                            <line x1="8" y1="11" x2="14" y2="11" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          title={t('copy_link', 'Copy link')}
                          onClick={handleCopyLink(media)}
                          className="p-[6px] text-textColor/60 hover:text-textColor hover:bg-newTextColor/[0.08] rounded-[6px] transition-colors"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          title={t('download', 'Download')}
                          onClick={handleDownload(media)}
                          className="p-[6px] text-textColor/60 hover:text-textColor hover:bg-newTextColor/[0.08] rounded-[6px] transition-colors"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          title={t('delete', 'Delete')}
                          onClick={deleteImage(media)}
                          className="p-[6px] text-red-500 hover:bg-red-500/10 rounded-[6px] transition-colors"
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mode 4: High-Density Compact Grid */}
            {!isLoading && viewMode === 'compact' && (
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-10 gap-[6px] p-[2px]">
                {processedMedia.map((media: any) => {
                  const isSelected = !!selected.find((p: any) => p.id === media.id);
                  const selectIdx = selected.findIndex((z: any) => z.id === media.id);
                  const isVideo = hasExtension(media.path, 'mp4') || media.type === 'video';
                  return (
                    <div
                      key={media.id}
                      onClick={addRemoveSelected(media)}
                      title={`${media.originalName || media.name} (${formatBytes(media.fileSize)})`}
                      className={clsx(
                        'group relative aspect-square rounded-[6px] overflow-hidden border transition-all bg-newBgColorInner select-none',
                        isSelected
                          ? 'border-[#612BD3] ring-2 ring-[#612BD3]/40'
                          : 'border-newTableBorder hover:border-textColor/40',
                        !standalone && 'cursor-pointer'
                      )}
                    >
                      {/* Selection badge */}
                      {isSelected ? (
                        <div className="text-white flex z-[101] justify-center items-center text-[11px] font-[600] w-[20px] h-[20px] rounded-full bg-[#612BD3] absolute top-[4px] right-[4px] shadow">
                          {selectIdx + 1}
                        </div>
                      ) : (
                        <div className="absolute top-[4px] right-[4px] z-[100] hidden group-hover:flex items-center gap-[2px] bg-black/75 backdrop-blur-sm rounded-[4px] p-[2px]">
                          <button
                            type="button"
                            title={t('zoom', 'Zoom')}
                            onClick={maximize(media)}
                            className="p-[3px] text-white/80 hover:text-white"
                          >
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="11" cy="11" r="8" />
                              <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            title={t('delete', 'Delete')}
                            onClick={deleteImage(media)}
                            className="p-[3px] text-red-400 hover:text-red-300"
                          >
                            <TrashIcon size={11} />
                          </button>
                        </div>
                      )}

                      <div className="w-full h-full relative">
                        {isVideo ? (
                          <VideoFrame url={mediaDirectory.set(media.path)} />
                        ) : (
                          <img
                            width="100%"
                            height="100%"
                            className="w-full h-full object-cover"
                            src={mediaDirectory.set(media.path)}
                            alt="media"
                          />
                        )}
                      </div>

                      {/* Small bottom name preview */}
                      <div className="absolute bottom-0 inset-x-0 bg-black/65 text-white text-[9px] px-[4px] py-[1px] truncate">
                        {media.originalName || media.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {(data?.pages || 0) > 1 && (
          <Pagination
            current={page}
            totalPages={data?.pages}
            setPage={setPage}
          />
        )}
        {!standalone && (
          <div className="flex justify-end mt-[32px] gap-[8px] mobile:flex-col mobile:mt-[16px] mobile:gap-[12px]">
            {!isLoading && !!data?.results?.length && (
              <div className="hidden mobile:flex gap-[8px] mobile:child:flex-1">
                {btn}
                <ThirdPartyMediaLibrary onImported={() => mutate()} />
              </div>
            )}
            <button
              onClick={() => modals.closeCurrent()}
              className="cursor-pointer h-[52px] px-[20px] items-center justify-center border border-newTextColor/10 flex rounded-[10px] mobile:hidden"
            >
              {t('cancel', 'Cancel')}
            </button>
            {!isLoading && !!data?.results?.length && (
              <button
                onClick={standalone ? () => {} : addMedia}
                disabled={selected.length === 0}
                className="cursor-pointer text-white disabled:opacity-80 disabled:cursor-not-allowed h-[52px] px-[20px] items-center justify-center bg-[#612BD3] flex rounded-[10px] mobile:h-[44px] mobile:rounded-[8px] mobile:font-[600] mobile:disabled:opacity-100 mobile:disabled:bg-btnSimple mobile:disabled:text-textItemBlur"
              >
                {t('add_selected_media', 'Add selected media')}
              </button>
            )}
          </div>
        )}
      </div>
    </DropFiles>
  );
};
export const MultiMediaComponent: FC<{
  label: string;
  description: string;
  mediaNotAvailable?: boolean;
  dummy: boolean;
  allData: {
    content: string;
    id?: string;
    image?: Array<{
      id: string;
      path: string;
    }>;
  }[];
  value?: Array<{
    path: string;
    id: string;
  }>;
  text: string;
  name: string;
  error?: any;
  onOpen?: () => void;
  onClose?: () => void;
  toolBar?: React.ReactNode;
  // after the tools, outside of their scroll
  toolBarEnd?: React.ReactNode;
  toolsClassName?: string;
  toolsStyle?: React.CSSProperties;
  information?: React.ReactNode;
  insertInContent?: (media: Array<{ id: string; path: string }>) => void;
  onChange: (event: {
    target: {
      name: string;
      value?: Array<{
        id: string;
        path: string;
        alt?: string;
        thumbnail?: string;
        thumbnailTimestamp?: number;
      }>;
    };
  }) => void;
}> = (props) => {
  const {
    name,
    error,
    text,
    onChange,
    value,
    allData,
    dummy,
    toolBar,
    toolBarEnd,
    toolsClassName,
    toolsStyle,
    information,
    mediaNotAvailable,
    insertInContent,
  } = props;
  const user = useUser();
  const modals = useModals();
  const t = useT();
  useEffect(() => {
    if (value) {
      setCurrentMedia(value);
    }
  }, [value]);

  const [currentMedia, setCurrentMedia] = useState(value);
  const mediaDirectory = useMediaDirectory();
  const changeMedia = useCallback(
    (
      m:
        | {
            path: string;
            id: string;
          }
        | {
            path: string;
            id: string;
          }[]
    ) => {
      const mediaArray = Array.isArray(m) ? m : [m];
      if (insertInContent) {
        insertInContent(mediaArray);
        return;
      }

      const newMedia = [...(currentMedia || []), ...mediaArray];
      setCurrentMedia(newMedia);
      onChange({
        target: {
          name,
          value: newMedia,
        },
      });
    },
    [currentMedia, insertInContent]
  );
  const showModal = useCallback(() => {
    modals.openModal({
      title: t('media_library', 'Media Library'),
      askClose: false,
      closeOnEscape: true,
      fullScreen: true,
      size: mediaLibrarySize(),
      height: mediaLibrarySize(),
      children: (close) => (
        <MediaBox
          setMedia={changeMedia}
          closeModal={close}
          type={insertInContent ? 'image' : undefined}
        />
      ),
    });
  }, [changeMedia, insertInContent, t]);

  const clearMedia = useCallback(
    (topIndex: number) => () => {
      const newMedia = currentMedia?.filter((f, index) => index !== topIndex);
      setCurrentMedia(newMedia);
      onChange({
        target: {
          name,
          value: newMedia,
        },
      });
    },
    [currentMedia]
  );

  const designMedia = useCallback(() => {
    if (!!user?.tier?.ai && !dummy) {
      modals.openModal({
        askClose: false,
        title: t('design_media', 'Design Media'),
        size: '80%',
        children: (close) => (
          <Polonto setMedia={changeMedia} closeModal={close} />
        ),
      });
    }
  }, [changeMedia, t]);

  return (
    <>
      <div className="b1 flex flex-col gap-[8px] mobile:gap-[16px] rounded-bl-[8px] select-none w-full">
        <div className="flex gap-[10px] px-[12px] mobile:px-0 mobile:empty:hidden">
          {!!currentMedia?.length && (
            <ReactSortable
              list={currentMedia}
              setList={(value) =>
                onChange({ target: { name: 'upload', value } })
              }
              className="flex gap-[10px] sortable-container"
              animation={200}
              swap={true}
              handle=".dragging"
            >
              {currentMedia.map((media, index) => (
                  <div key={media.id} className="cursor-pointer rounded-[5px] w-[40px] h-[40px] mobile:w-[60px] mobile:h-[60px] mobile:rounded-[8px] border-2 mobile:border-0 border-tableBorder relative flex transition-all">
                    <DragHandleIcon className="z-[20] dragging absolute pe-[1px] pb-[3px] -start-[4px] -top-[4px] cursor-move" />

                    <div className="w-full h-full relative group">
                      <div
                        onClick={async () => {
                          modals.openModal({
                            title: t('media_settings', 'Media Settings'),
                            size: '720px',
                            children: (close) => (
                              <MediaComponentInner
                                media={media as any}
                                onClose={close}
                                onSelect={(value: any) => {
                                  onChange({
                                    target: {
                                      name: 'upload',
                                      value: currentMedia.map((p) => {
                                        if (p.id === media.id) {
                                          return {
                                            ...p,
                                            ...value,
                                          };
                                        }
                                        return p;
                                      }),
                                    },
                                  });
                                }}
                              />
                            ),
                          });
                        }}
                        className="absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] bg-black/80 rounded-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-[9]"
                      >
                        <MediaSettingsIcon className="cursor-pointer relative z-[200]" />
                      </div>
                      {hasExtension(media?.path, 'mp4') ? (
                        <VideoFrame url={mediaDirectory.set(media?.path)} />
                      ) : (
                        <img
                          className="w-full h-full object-cover rounded-[4px] mobile:rounded-[8px]"
                          src={mediaDirectory.set(media?.path)}
                        />
                      )}
                    </div>

                    <CloseCircleIcon
                      onClick={clearMedia(index)}
                      className="absolute -end-[4px] -top-[4px] mobile:-end-[8px] mobile:-top-[8px] mobile:w-[24px] mobile:h-[24px] z-[20] rounded-full bg-white"
                    />
                  </div>
              ))}
            </ReactSortable>
          )}
        </div>
        {/* on phones the info stays with the post, the tools can move to the bottom */}
        {information && (
          <div className="hidden mobile:flex justify-end">{information}</div>
        )}
        <div
          className={clsx(
            'flex gap-[8px] px-[12px] mobile:px-0 border-t border-newColColor mobile:border-t-0 w-full b1 text-textColor',
            toolsClassName
          )}
          style={toolsStyle}
        >
          <div className="flex gap-[8px] mobile:gap-[4px] mobile:flex-1 mobile:min-w-0 mobile:overflow-x-auto mobile:scrollbar-none b1">
            {!mediaNotAvailable && (
              <div className="flex py-[10px] mobile:py-0 mobile:shrink-0 b2 items-center gap-[4px]">
                <div
                  onClick={showModal}
                  className="cursor-pointer h-[30px] mobile:h-[40px] mobile:min-w-[40px] rounded-[6px] mobile:rounded-[8px] justify-center items-center flex bg-newColColor mobile:bg-newSettings px-[8px]"
                >
                  <div className="flex gap-[8px] items-center">
                    <div>
                      <InsertMediaIcon className="mobile:w-[20px] mobile:h-[20px]" />
                    </div>
                    <div className="text-[10px] font-[600] maxMedia:hidden block">
                      {t('insert_media', 'Insert Media')}
                    </div>
                  </div>
                </div>
                <div
                  onClick={designMedia}
                  className="cursor-pointer h-[30px] rounded-[6px] justify-center items-center flex bg-newColColor px-[8px] mobile:hidden"
                >
                  <div className="flex gap-[5px] items-center">
                    <div>
                      <DesignMediaIcon />
                    </div>
                    <div className="text-[10px] font-[600] iconBreak:hidden block">
                      {t('design_media', 'Design Media')}
                    </div>
                  </div>
                </div>

                {!insertInContent && (
                  <ThirdPartyMedia allData={allData} onChange={changeMedia} />
                )}

                {!!user?.tier?.ai && (
                  <>
                    <AiImage value={text} onChange={changeMedia} />
                    {!insertInContent && (
                      <AiVideo value={text} onChange={changeMedia} />
                    )}
                  </>
                )}
              </div>
            )}
            {!mediaNotAvailable && (
              <div
                className={clsx(
                  'text-newColColor h-full flex items-center mobile:shrink-0 mobile:px-[4px]',
                  !toolBar && 'mobile:hidden'
                )}
              >
                <VerticalDividerIcon />
              </div>
            )}
            {!!toolBar && (
              <div className="flex py-[10px] mobile:py-0 mobile:shrink-0 b2 items-center gap-[4px]">
                {toolBar}
              </div>
            )}
            {!!toolBar && (
              <div className="hidden mobile:block sticky end-0 shrink-0 w-[40px] pointer-events-none bg-gradient-to-l rtl:bg-gradient-to-r from-newBgColorInner" />
            )}
          </div>
          {toolBarEnd}
          {information && (
            <div className="flex-1 justify-end flex py-[10px] mobile:hidden b2 items-center gap-[4px]">
              {information}
            </div>
          )}
        </div>
      </div>
      <div className="text-[12px] text-red-400">{error}</div>
    </>
  );
};
export const MediaComponent: FC<{
  label: string;
  description: string;
  value?: {
    path: string;
    id: string;
  };
  name: string;
  onChange: (event: {
    target: {
      name: string;
      value?: {
        id: string;
        path: string;
      };
    };
  }) => void;
  type?: 'image' | 'video';
  width?: number;
  height?: number;
}> = (props) => {
  const t = useT();

  const { name, type, label, description, onChange, value, width, height } =
    props;
  const { getValues } = useSettings();
  const user = useUser();
  useEffect(() => {
    const settings = getValues()[props.name];
    if (settings) {
      setCurrentMedia(settings);
    }
  }, []);
  const [currentMedia, setCurrentMedia] = useState(value);
  const modals = useModals();
  const mediaDirectory = useMediaDirectory();

  const showDesignModal = useCallback(() => {
    modals.openModal({
      title: t('media_editor', 'Media Editor'),
      askClose: false,
      closeOnEscape: true,
      fullScreen: true,
      size: 'calc(100% - 80px)',
      height: 'calc(100% - 80px)',
      children: (close) => (
        <Polonto
          width={width}
          height={height}
          setMedia={changeMedia}
          closeModal={close}
        />
      ),
    });
  }, [t]);
  const changeMedia = useCallback((m: { path: string; id: string }[]) => {
    setCurrentMedia(m[0]);
    onChange({
      target: {
        name,
        value: m[0],
      },
    });
  }, []);
  const showModal = useCallback(() => {
    modals.openModal({
      title: t('media_library', 'Media Library'),
      askClose: false,
      closeOnEscape: true,
      fullScreen: true,
      size: mediaLibrarySize(),
      height: mediaLibrarySize(),
      children: (close) => (
        <MediaBox setMedia={changeMedia} closeModal={close} type={type} />
      ),
    });
  }, [t]);
  const clearMedia = useCallback(() => {
    setCurrentMedia(undefined);
    onChange({
      target: {
        name,
        value: undefined,
      },
    });
  }, [value]);
  return (
    <div className="flex flex-col gap-[8px]">
      <div className="text-[14px]">{label}</div>
      <div className="text-[12px]">{description}</div>
      {!!currentMedia && (
        <div className="my-[20px] cursor-pointer w-[200px] h-[200px] border-2 border-tableBorder">
          <img
            className="w-full h-full object-cover"
            src={currentMedia.path}
            onClick={() => window.open(mediaDirectory.set(currentMedia.path))}
          />
        </div>
      )}
      <div className="flex gap-[5px]">
        <Button onClick={showModal}>{t('select', 'Select')}</Button>
        <Button
          onClick={showDesignModal}
          className="!bg-customColor45 mobile:hidden"
        >
          {t('editor', 'Editor')}
        </Button>
        <Button secondary={true} onClick={clearMedia}>
          {t('clear', 'Clear')}
        </Button>
      </div>
    </div>
  );
};
