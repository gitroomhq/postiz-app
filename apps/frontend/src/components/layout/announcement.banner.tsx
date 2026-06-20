'use client';

import { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';

type AnnouncementColor = 'INFO' | 'WARNING' | 'ERROR';

interface Announcement {
  id: string;
  title: string;
  description: string;
  color: AnnouncementColor;
  createdAt: string;
}

const colorStyles: Record<AnnouncementColor, { bg: string; hover: string }> = {
  INFO: { bg: 'bg-blue-600', hover: 'hover:bg-blue-500' },
  WARNING: { bg: 'bg-amber-600', hover: 'hover:bg-amber-500' },
  ERROR: { bg: 'bg-red-600', hover: 'hover:bg-red-500' },
};

const useAnnouncements = () => {
  const fetch = useFetch();
  return useSWR<Announcement[]>('/announcements', async () => {
    return (await fetch('/announcements')).json();
  }, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });
};

const AnnouncementDetailModal: FC<{
  announcement: Announcement;
  close: () => void;
  isAdmin: boolean;
  onDelete: (id: string) => Promise<void>;
}> = ({ announcement, close, isAdmin, onDelete }) => {
  const t = useT();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (
      !(await deleteDialog(
        t(
          'delete_announcement_confirm',
          'Are you sure you want to delete this announcement?'
        ),
        t('yes_delete', 'Yes, delete'),
        t('confirm_delete', 'Confirm Delete'),
        t('no_cancel', 'No, cancel')
      ))
    ) {
      return;
    }
    setDeleting(true);
    try {
      await onDelete(announcement.id);
      close();
    } finally {
      setDeleting(false);
    }
  }, [announcement.id, onDelete]);

  return (
    <div className="flex flex-col gap-[16px] min-w-[500px]">
      <div className="text-newTextColor/60 text-[13px]">
        {new Date(announcement.createdAt).toLocaleDateString()}
      </div>
      <div className="whitespace-pre-wrap text-newTextColor">
        {announcement.description}
      </div>
      {isAdmin && (
        <div className="flex justify-end">
          <Button
            onClick={handleDelete}
            loading={deleting}
            className="!bg-red-700 rounded-[4px]"
          >
            {t('delete_announcement', 'Delete Announcement')}
          </Button>
        </div>
      )}
    </div>
  );
};

export const AnnouncementBanner: FC = () => {
  const { data: announcements, mutate } = useAnnouncements();
  const user = useUser();
  const fetch = useFetch();
  const { openModal } = useModals();
  const t = useT();

  const handleDelete = useCallback(
    async (id: string) => {
      await fetch(`/announcements/${id}`, {
        method: 'DELETE',
      });
      await mutate();
    },
    [fetch, mutate]
  );

  const handleClick = useCallback(
    (announcement: Announcement) => () => {
      openModal({
        title: announcement.title,
        children: (close) => (
          <AnnouncementDetailModal
            announcement={announcement}
            close={close}
            isAdmin={!!user?.isSuperAdmin}
            onDelete={handleDelete}
          />
        ),
      });
    },
    [user?.isSuperAdmin, handleDelete]
  );

  if (!announcements?.length) return null;

  const latest = announcements[0];
  const style = colorStyles[latest.color] || colorStyles.INFO;

  return (
    <div
      className={`${style.bg} ${style.hover} text-white px-[16px] py-[8px] text-center cursor-pointer rounded-[8px] text-[14px] font-[500] transition-colors`}
      onClick={handleClick(latest)}
    >
      {latest.title}
      {announcements.length > 1 && (
        <span className="ml-[8px] opacity-70">
          (+{announcements.length - 1} {t('more', 'more')})
        </span>
      )}
      <style>{`#left-menu {padding-top: ${user?.isSuperAdmin ? '100px !important;' : '60px !important;'}`}</style>
    </div>
  );
};
