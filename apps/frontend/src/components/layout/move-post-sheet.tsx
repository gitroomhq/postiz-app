'use client';

import { FC, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { MobileSheet } from '@gitroom/frontend/components/layout/mobile-sheet';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';

/**
 * Touch replacement for calendar HTML5 drag-reschedule. The caller still
 * owns the PUT — this only collects a local datetime.
 */
export const MovePostSheet: FC<{
  open: boolean;
  onClose: () => void;
  current: dayjs.Dayjs | Date | string;
  onConfirm: (next: dayjs.Dayjs) => void | Promise<void>;
}> = ({ open, onClose, current, onConfirm }) => {
  const t = useT();
  const initial = useMemo(
    () => newDayjs(current).format('YYYY-MM-DDTHH:mm'),
    [current]
  );
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title={t('reschedule_post', 'Reschedule the post')}
      footer={
        <Button
          type="button"
          disabled={saving || !value}
          className="h-[44px] w-full"
          onClick={async () => {
            setSaving(true);
            try {
              await onConfirm(newDayjs(value));
              onClose();
            } finally {
              setSaving(false);
            }
          }}
        >
          {t('move', 'Move')}
        </Button>
      }
    >
      <label className="flex flex-col gap-[8px] text-[13px] text-pqMuted">
        {t('date', 'Date')}
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-[44px] w-full rounded-[10px] bg-pqTableHeader px-[12px] text-[16px] text-pqText shadow-[inset_0_0_0_1px_var(--border)] outline-none focus:shadow-[inset_0_0_0_1px_var(--brand)]"
        />
      </label>
    </MobileSheet>
  );
};

/**
 * Phone and tablet Move control for calendar / queue cards. Reuses the same PUT
 * string as HTML5 drop (`/posts/${item.id}/date`) so the API baseline stays.
 */
export const CalendarMoveButton: FC<{
  post: { id: string; publishDate: string | Date };
  className?: string;
}> = ({ post, className }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { touch } = useViewport();
  const { changeDate, reloadCalendarView } = useCalendar();
  const [open, setOpen] = useState(false);
  if (!touch) return null;
  const item = post;
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        aria-label={t('move', 'Move')}
      >
        {t('move', 'Move')}
      </button>
      <MovePostSheet
        open={open}
        onClose={() => setOpen(false)}
        current={dayjs.utc(item.publishDate).local()}
        onConfirm={async (next) => {
          changeDate(item.id, next);
          const { status } = await fetch(`/posts/${item.id}/date`, {
            method: 'PUT',
            body: JSON.stringify({
              date: next.utc().format('YYYY-MM-DDTHH:mm:ss'),
            }),
          });
          if (status < 200 || status >= 300) {
            toaster.show(
              t(
                'post_move_failed',
                'Could not move this post, please try again'
              ),
              'warning'
            );
            reloadCalendarView();
          }
        }}
      />
    </>
  );
};
