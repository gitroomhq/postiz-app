'use client';

import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';

interface Folder {
  id: string;
  name: string;
  count: number;
}
interface FoldersResponse {
  folders: Folder[];
  unfiled: number;
  total: number;
}
interface MediaItem {
  id: string;
  name: string;
  originalName?: string;
  path: string;
  thumbnail?: string;
  alt?: string;
  folderId?: string | null;
  type?: string;
}

const isVideoPath = (p?: string) => /\.(mp4|mov|webm|m4v|avi)$/i.test(p || '');

const MediaTile: FC<{
  m: MediaItem;
  folders: Folder[];
  onMove: (id: string, folderId: string | null) => void;
  t: (k: string, d: string) => string;
}> = ({ m, folders, onMove, t }) => {
  const dir = useMediaDirectory();
  const url = dir.set(m.path);
  const poster = m.thumbnail ? dir.set(m.thumbnail) : undefined;
  const video = isVideoPath(m.path);
  return (
    <div className="glass-surface bg-newBgColorInner border border-newTableBorder rounded-[14px] overflow-hidden flex flex-col group">
      <div
        className="relative aspect-square bg-newBgLineColor cursor-pointer"
        onClick={() => window.open(url, '_blank')}
      >
        {video ? (
          <video
            src={url}
            poster={poster}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={url}
            alt={m.alt || m.originalName || ''}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        )}
        {video && (
          <div className="absolute top-[8px] end-[8px] w-[22px] h-[22px] rounded-full bg-black/55 flex items-center justify-center pointer-events-none">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-[8px] flex flex-col gap-[6px]">
        <div className="text-[11px] text-textItemBlur truncate" title={m.originalName || m.name}>
          {m.originalName || m.name}
        </div>
        <select
          value={m.folderId || ''}
          onChange={(e) => onMove(m.id, e.target.value || null)}
          className="w-full bg-newBgLineColor border border-newTableBorder rounded-[8px] px-[8px] py-[5px] text-[11px] text-newTextColor outline-none focus:border-btnPrimary"
        >
          <option value="">{t('unfiled', 'Unfiled')}</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export const MediaLibraryComponent: FC = () => {
  const fetch = useFetch();
  const t = useT();
  const toast = useToaster();
  const [selected, setSelected] = useState<string>('all'); // 'all' | 'unfiled' | id
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [newFolder, setNewFolder] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [busy, setBusy] = useState(false);

  // debounce search
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const load = useCallback(async (url: string) => (await fetch(url)).json(), []);

  const { data: foldersData, mutate: mutateFolders } = useSWR<FoldersResponse>(
    '/media/folders',
    load
  );
  const folders = foldersData?.folders || [];

  const mediaKey = useMemo(() => {
    const params = new URLSearchParams({ page: String(page + 1) });
    if (search) params.set('search', search);
    if (selected !== 'all') params.set('folderId', selected);
    return `/media?${params.toString()}`;
  }, [page, search, selected]);

  const { data: mediaData, isLoading, mutate: mutateMedia } = useSWR(
    mediaKey,
    load
  );
  const results: MediaItem[] = mediaData?.results || [];
  const pages: number = mediaData?.pages || 0;

  const refresh = useCallback(() => {
    mutateMedia();
    mutateFolders();
  }, [mutateMedia, mutateFolders]);

  const selectFolder = useCallback((key: string) => {
    setSelected(key);
    setPage(0);
  }, []);

  const createFolder = useCallback(async () => {
    const name = newFolder.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/media/folders', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setNewFolder('');
        mutateFolders();
        toast.show(t('folder_created', 'Folder created'));
      } else {
        toast.show(t('action_failed', 'Action failed'), 'warning');
      }
    } finally {
      setBusy(false);
    }
  }, [newFolder, busy, mutateFolders, t]);

  const saveRename = useCallback(
    async (id: string) => {
      const name = renameVal.trim();
      if (!name) {
        setRenaming(null);
        return;
      }
      const res = await fetch(`/media/folders/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
      });
      setRenaming(null);
      if (res.ok) {
        mutateFolders();
      } else {
        toast.show(t('action_failed', 'Action failed'), 'warning');
      }
    },
    [renameVal, mutateFolders, t]
  );

  const removeFolder = useCallback(
    async (id: string) => {
      const ok = await deleteDialog(
        t(
          'delete_folder_confirm',
          'Delete this folder? Its media will move to Unfiled.'
        ),
        t('yes_delete', 'Yes, delete')
      );
      if (!ok) return;
      const res = await fetch(`/media/folders/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selected === id) setSelected('all');
        refresh();
        toast.show(t('folder_deleted', 'Folder deleted'));
      } else {
        toast.show(t('action_failed', 'Action failed'), 'warning');
      }
    },
    [selected, refresh, t]
  );

  const move = useCallback(
    async (mediaId: string, folderId: string | null) => {
      const res = await fetch(`/media/${mediaId}/folder`, {
        method: 'POST',
        body: JSON.stringify({ folderId }),
      });
      if (res.ok) {
        refresh();
        toast.show(
          folderId
            ? t('moved_to_folder', 'Moved to folder')
            : t('moved_to_unfiled', 'Moved to Unfiled')
        );
      } else {
        toast.show(t('action_failed', 'Action failed'), 'warning');
      }
    },
    [refresh, t]
  );

  const FolderButton: FC<{
    id: string;
    label: string;
    count?: number;
    icon: React.ReactNode;
  }> = ({ id, label, count, icon }) => {
    const isSel = selected === id;
    return (
      <button
        onClick={() => selectFolder(id)}
        className={`w-full text-start flex items-center gap-[9px] px-[10px] py-[9px] rounded-[10px] text-[13px] font-[600] transition-colors ${
          isSel
            ? 'bg-btnPrimary/10 text-newTextColor'
            : 'text-newTextColor hover:bg-newBgLineColor/50'
        }`}
      >
        <span className={isSel ? 'text-btnPrimary' : 'text-textItemBlur'}>
          {icon}
        </span>
        <span className="flex-1 truncate">{label}</span>
        {count !== undefined && (
          <span className="text-[11px] text-textItemBlur tabular-nums">
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex-1 flex flex-col gap-[16px] p-[20px]">
      <div>
        <h1 className="text-[22px] font-[600]">{t('media_library', 'Media Library')}</h1>
        <p className="text-[13px] text-textItemBlur mt-[2px]">
          {t(
            'media_library_sub',
            'Organise your images and videos into folders.'
          )}
        </p>
      </div>

      <div className="flex-1 flex gap-[16px] min-h-0 flex-col lg:flex-row">
        {/* Folder sidebar */}
        <div className="glass-surface bg-newBgColorInner border border-newTableBorder rounded-[16px] p-[10px] w-full lg:w-[280px] shrink-0 overflow-auto flex flex-col gap-[2px]">
          <FolderButton
            id="all"
            label={t('all_media', 'All media')}
            count={foldersData?.total}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            }
          />
          <FolderButton
            id="unfiled"
            label={t('unfiled', 'Unfiled')}
            count={foldersData?.unfiled}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
            }
          />

          <div className="h-px bg-newTableBorder my-[6px]" />
          <div className="text-[10px] uppercase tracking-wider text-textItemBlur font-[600] px-[10px] py-[4px]">
            {t('folders', 'Folders')}
          </div>

          {folders.map((f) =>
            renaming === f.id ? (
              <div key={f.id} className="flex items-center gap-[6px] px-[6px] py-[4px]">
                <input
                  autoFocus
                  value={renameVal}
                  onChange={(e) => setRenameVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRename(f.id);
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                  onBlur={() => saveRename(f.id)}
                  className="flex-1 min-w-0 bg-newBgLineColor border border-btnPrimary rounded-[8px] px-[8px] py-[6px] text-[12.5px] text-newTextColor outline-none"
                />
              </div>
            ) : (
              <div key={f.id} className="flex items-center group/folder">
                <div className="flex-1 min-w-0">
                  <FolderButton
                    id={f.id}
                    label={f.name}
                    count={f.count}
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      </svg>
                    }
                  />
                </div>
                <div className="flex items-center opacity-0 group-hover/folder:opacity-100 transition-opacity pe-[4px]">
                  <button
                    onClick={() => {
                      setRenaming(f.id);
                      setRenameVal(f.name);
                    }}
                    className="p-[5px] text-textItemBlur hover:text-newTextColor"
                    title={t('rename', 'Rename')}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => removeFolder(f.id)}
                    className="p-[5px] text-textItemBlur hover:text-[#d16a6a]"
                    title={t('delete', 'Delete')}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          )}

          <div className="flex items-center gap-[6px] px-[6px] pt-[8px]">
            <input
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createFolder();
              }}
              placeholder={t('new_folder', 'New folder…')}
              className="flex-1 min-w-0 bg-newBgLineColor border border-newTableBorder rounded-[8px] px-[9px] py-[7px] text-[12.5px] text-newTextColor outline-none focus:border-btnPrimary"
            />
            <button
              onClick={createFolder}
              disabled={!newFolder.trim() || busy}
              className="shrink-0 w-[30px] h-[30px] rounded-[8px] bg-btnPrimary text-white flex items-center justify-center disabled:opacity-50"
              title={t('add_folder', 'Add folder')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </div>

        {/* Media grid */}
        <div className="flex-1 flex flex-col gap-[12px] min-w-0">
          <div className="flex items-center gap-[10px] flex-wrap">
            <div className="text-[14px] font-[600] flex-1 min-w-[140px]">
              {selected === 'all'
                ? t('all_media', 'All media')
                : selected === 'unfiled'
                ? t('unfiled', 'Unfiled')
                : folders.find((f) => f.id === selected)?.name ||
                  t('folder', 'Folder')}
            </div>
            <div className="flex items-center gap-[8px] bg-newBgColorInner border border-newTableBorder rounded-[12px] px-[14px] py-[9px] min-w-[200px]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-textItemBlur">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4-4" />
              </svg>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('search_media', 'Search media…')}
                className="bg-transparent outline-none text-[13px] flex-1 text-newTextColor"
              />
            </div>
          </div>

          {isLoading && !mediaData ? (
            <div className="py-[60px] text-center text-textItemBlur text-[13px]">
              {t('loading', 'Loading…')}
            </div>
          ) : results.length === 0 ? (
            <div className="glass-surface bg-newBgColorInner border border-newTableBorder rounded-[16px] px-[18px] py-[56px] text-center">
              <div className="text-[14px] font-[600]">
                {t('no_media_here', 'No media in this view')}
              </div>
              <div className="text-[12.5px] text-textItemBlur mt-[5px]">
                {t(
                  'no_media_help',
                  'Upload media from the Media page, then organise it into folders here.'
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[12px]">
                {results.map((m) => (
                  <MediaTile
                    key={m.id}
                    m={m}
                    folders={folders}
                    onMove={move}
                    t={t}
                  />
                ))}
              </div>

              {pages > 1 && (
                <div className="flex items-center justify-center gap-[10px] pt-[6px]">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-[12px] py-[7px] rounded-[10px] text-[12.5px] font-[600] bg-newBgColorInner border border-newTableBorder text-newTextColor disabled:opacity-40"
                  >
                    {t('prev', 'Prev')}
                  </button>
                  <span className="text-[12.5px] text-textItemBlur tabular-nums">
                    {page + 1} / {pages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                    disabled={page >= pages - 1}
                    className="px-[12px] py-[7px] rounded-[10px] text-[12.5px] font-[600] bg-newBgColorInner border border-newTableBorder text-newTextColor disabled:opacity-40"
                  >
                    {t('next', 'Next')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
