'use client';

import { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export interface MediaFolder {
  id: string;
  name: string;
  parentId: string | null;
}

export const MediaFoldersSidebar: FC<{
  selectedFolder?: string;
  setSelectedFolder: (folderId?: string) => void;
}> = ({ selectedFolder, setSelectedFolder }) => {
  const fetch = useFetch();
  const t = useT();
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingId, setRenamingId] = useState<string | undefined>();
  const [renameValue, setRenameValue] = useState('');

  const loadFolders = useCallback(async () => {
    return (await fetch('/media/folders')).json();
  }, []);

  const { data: folders, mutate } = useSWR<MediaFolder[]>(
    'get-media-folders',
    loadFolders,
  );

  const createFolder = useCallback(async () => {
    const name = newFolderName.trim();
    if (!name) {
      setCreating(false);
      return;
    }
    await fetch('/media/folders', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    setNewFolderName('');
    setCreating(false);
    mutate();
  }, [newFolderName, mutate]);

  const renameFolder = useCallback(
    async (id: string) => {
      const name = renameValue.trim();
      setRenamingId(undefined);
      if (!name) {
        return;
      }
      await fetch(`/media/folders/${id}`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      mutate();
    },
    [renameValue, mutate],
  );

  const deleteFolder = useCallback(
    (id: string) => async () => {
      if (
        !(await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete_the_folder',
            'Are you sure you want to delete the folder? Media inside will not be deleted.',
          ),
        ))
      ) {
        return;
      }
      await fetch(`/media/folders/${id}`, {
        method: 'DELETE',
      });
      if (selectedFolder === id) {
        setSelectedFolder(undefined);
      }
      mutate();
    },
    [mutate, selectedFolder, setSelectedFolder],
  );

  return (
    <div className="flex flex-col gap-[4px] w-[200px] shrink-0 pe-[12px] border-e border-newColColor">
      <div
        onClick={() => setSelectedFolder(undefined)}
        className={clsx(
          'cursor-pointer px-[10px] py-[8px] rounded-[6px] text-[14px]',
          !selectedFolder ? 'bg-forth text-white' : 'hover:bg-forth/50',
        )}
      >
        {t('all_media', 'All media')}
      </div>
      {(folders || []).map((folder) => (
        <div
          key={folder.id}
          className={clsx(
            'group flex items-center gap-[6px] px-[10px] py-[8px] rounded-[6px] text-[14px]',
            selectedFolder === folder.id
              ? 'bg-forth text-white'
              : 'hover:bg-forth/50',
          )}
        >
          {renamingId === folder.id ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => renameFolder(folder.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') renameFolder(folder.id);
                if (e.key === 'Escape') setRenamingId(undefined);
              }}
              className="flex-1 bg-transparent outline-none border-b border-newColColor text-[14px]"
            />
          ) : (
            <>
              <div
                className="flex-1 truncate cursor-pointer"
                onClick={() => setSelectedFolder(folder.id)}
              >
                {folder.name}
              </div>
              <div
                className="hidden group-hover:block cursor-pointer text-[12px] opacity-70 hover:opacity-100"
                onClick={() => {
                  setRenamingId(folder.id);
                  setRenameValue(folder.name);
                }}
              >
                {t('rename', 'Rename')}
              </div>
              <div
                className="hidden group-hover:block cursor-pointer text-[12px] opacity-70 hover:opacity-100"
                onClick={deleteFolder(folder.id)}
              >
                {t('delete', 'Delete')}
              </div>
            </>
          )}
        </div>
      ))}
      {creating ? (
        <input
          autoFocus
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onBlur={createFolder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') createFolder();
            if (e.key === 'Escape') setCreating(false);
          }}
          placeholder={t('folder_name', 'Folder name')}
          className="px-[10px] py-[8px] rounded-[6px] text-[14px] bg-newBgColorInner border border-newColColor outline-none"
        />
      ) : (
        <div
          onClick={() => setCreating(true)}
          className="cursor-pointer px-[10px] py-[8px] rounded-[6px] text-[14px] text-newTextColor/[0.6] hover:text-newTextColor"
        >
          + {t('new_folder', 'New folder')}
        </div>
      )}
    </div>
  );
};
