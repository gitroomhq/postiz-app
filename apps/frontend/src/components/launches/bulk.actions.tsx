'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { State } from '@prisma/client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { Button } from '@gitroom/react/form/button';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { getTimezone } from '@gitroom/frontend/components/layout/set.timezone';
import { isUSCitizen } from '@gitroom/frontend/components/launches/helpers/isuscitizen.utils';
import type { BulkPostsResult } from '@gitroom/nestjs-libraries/dtos/posts/bulk.posts.dto';

export interface BulkSelectedPost {
  id: string;
  state: State;
  publishDate: string | Date;
}

type ShiftUnit = 'minutes' | 'hours' | 'days' | 'weeks';

// Days and weeks keep the wall-clock time of the user's timezone, so a daily
// post stays at the same hour when a daylight saving change is crossed.
const shiftDate = (
  publishDate: string | Date,
  amount: number,
  unit: ShiftUnit
) => {
  const timezone = getTimezone();
  if (unit === 'minutes' || unit === 'hours') {
    return dayjs.utc(publishDate).add(amount, unit);
  }

  const wallClock = dayjs
    .utc(publishDate)
    .tz(timezone)
    .format('YYYY-MM-DDTHH:mm:ss');
  return dayjs.tz(
    dayjs.utc(wallClock).add(amount, unit).format('YYYY-MM-DDTHH:mm:ss'),
    timezone
  );
};

export const useBulkPostActions = (
  posts: BulkSelectedPost[],
  onDone: () => void
) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const modals = useModals();
  const [busy, setBusy] = useState(false);

  const send = useCallback(
    async (path: string, body: object, successMessage: string) => {
      setBusy(true);
      try {
        const response = await fetch(`/posts/bulk/${path}`, {
          method: 'POST',
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          toaster.show(
            t('bulk_posts_failed', 'Something went wrong, please try again'),
            'warning'
          );
          return;
        }

        const result: BulkPostsResult = await response.json();
        if (result.failed.length) {
          toaster.show(
            t(
              'bulk_posts_partial',
              '{{done}} done, {{skipped}} skipped: {{reason}}',
              {
                done: result.succeeded.length,
                skipped: result.failed.length,
                reason: result.failed[0].reason,
                interpolation: { escapeValue: false },
              }
            ),
            'warning'
          );
        } else {
          toaster.show(successMessage, 'success');
        }

        onDone();
      } finally {
        setBusy(false);
      }
    },
    [fetch, toaster, t, onDone]
  );

  const deletePosts = useCallback(async () => {
    if (
      !(await deleteDialog(
        t(
          'are_you_sure_you_want_to_delete_posts',
          'Are you sure you want to delete the selected posts ({{n}})?',
          { n: posts.length }
        )
      ))
    ) {
      return;
    }

    await send(
      'delete',
      { ids: posts.map((post) => post.id) },
      t('posts_deleted_successfully', 'Posts deleted: {{n}}', {
        n: posts.length,
      })
    );
  }, [posts, send, t]);

  const changeStatus = useCallback(
    (status: 'draft' | 'schedule') => async () => {
      await send(
        'status',
        { ids: posts.map((post) => post.id), status },
        status === 'draft'
          ? t('posts_moved_to_draft', 'Moved to draft: {{n}}', {
              n: posts.length,
            })
          : t('posts_scheduled', 'Scheduled: {{n}}', { n: posts.length })
      );
    },
    [posts, send, t]
  );

  const reschedule = useCallback(
    async (amount: number, unit: ShiftUnit) => {
      await send(
        'date',
        {
          posts: posts.map((post) => ({
            id: post.id,
            date: shiftDate(post.publishDate, amount, unit).utc().format(),
          })),
        },
        t('posts_rescheduled', 'Rescheduled: {{n}}', { n: posts.length })
      );
    },
    [posts, send, t]
  );

  const openReschedule = useCallback(() => {
    modals.openModal({
      title: t('reschedule_posts', 'Reschedule posts'),
      closeOnClickOutside: true,
      closeOnEscape: true,
      withCloseButton: true,
      classNames: {
        modal: 'w-[100%] max-w-[500px]',
      },
      children: (
        <RescheduleModal
          posts={posts}
          onConfirm={async (amount, unit) => {
            modals.closeAll();
            await reschedule(amount, unit);
          }}
        />
      ),
    });
  }, [modals, posts, reschedule, t]);

  return { busy, deletePosts, changeStatus, openReschedule };
};

const RescheduleModal: FC<{
  posts: BulkSelectedPost[];
  onConfirm: (amount: number, unit: ShiftUnit) => void;
}> = ({ posts, onConfirm }) => {
  const t = useT();
  const [amountText, setAmountText] = useState('1');
  const [unit, setUnit] = useState<ShiftUnit>('days');
  const [direction, setDirection] = useState<'later' | 'earlier'>('later');

  const amount = Math.floor(Number(amountText));
  const validAmount = amount >= 1 && amount <= 1000;
  const signedAmount = direction === 'later' ? amount : -amount;
  const format = isUSCitizen() ? 'MM/DD/YYYY hh:mm A' : 'DD/MM/YYYY HH:mm';
  const example = useMemo(() => {
    // Published posts are skipped, so they make a poor example
    const first = posts.find((post) => post.state !== 'PUBLISHED');
    if (!validAmount || !first) {
      return null;
    }

    return {
      from: dayjs.utc(first.publishDate).tz(getTimezone()).format(format),
      to: shiftDate(first.publishDate, signedAmount, unit)
        .tz(getTimezone())
        .format(format),
    };
  }, [posts, signedAmount, unit, validAmount, format]);

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="text-[14px]">
        {t(
          'reschedule_posts_description',
          'Move the selected posts ({{n}}). Published posts are skipped.',
          { n: posts.length }
        )}
      </div>
      <div className="flex gap-[10px]">
        <div className="w-[100px]">
          <Input
            disableForm
            type="number"
            min={1}
            max={1000}
            name="amount"
            label={t('amount', 'Amount')}
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <Select
            disableForm
            name="unit"
            label={t('unit', 'Unit')}
            value={unit}
            onChange={(e) => setUnit(e.target.value as ShiftUnit)}
          >
            <option value="minutes">{t('minutes', 'Minutes')}</option>
            <option value="hours">{t('hours', 'Hours')}</option>
            <option value="days">{t('days', 'Days')}</option>
            <option value="weeks">{t('weeks', 'Weeks')}</option>
          </Select>
        </div>
        <div className="flex-1">
          <Select
            disableForm
            name="direction"
            label={t('direction', 'Direction')}
            value={direction}
            onChange={(e) =>
              setDirection(e.target.value as 'later' | 'earlier')
            }
          >
            <option value="later">{t('later', 'Later')}</option>
            <option value="earlier">{t('earlier', 'Earlier')}</option>
          </Select>
        </div>
      </div>
      {!!example && (
        <div className="text-[14px] text-textColor/70">
          {example.from} → {example.to}
        </div>
      )}
      <div>
        <Button
          className="rounded-[8px]"
          disabled={!validAmount}
          onClick={() => onConfirm(signedAmount, unit)}
        >
          {t('reschedule', 'Reschedule')}
        </Button>
      </div>
    </div>
  );
};

export const BulkActionsBar: FC<{
  posts: BulkSelectedPost[];
  totalOnPage: number;
  onSelectAll: () => void;
  onClear: () => void;
  onCancel: () => void;
  onDone: () => void;
}> = ({ posts, totalOnPage, onSelectAll, onClear, onCancel, onDone }) => {
  const t = useT();
  const { busy, deletePosts, changeStatus, openReschedule } =
    useBulkPostActions(posts, onDone);

  const hasSelection = posts.length > 0;
  const onlyPublished =
    hasSelection && posts.every((post) => post.state === 'PUBLISHED');
  const allSelected = hasSelection && posts.length === totalOnPage;

  return (
    <div className="flex flex-wrap items-center gap-[10px] mx-[10px] px-[12px] py-[8px] border border-newTableBorder bg-newBgColorInner rounded-[8px] text-[14px] text-textColor">
      <Checkbox
        disableForm
        checked={allSelected}
        label={t('select_all_on_page', 'Select all on this page')}
        onChange={allSelected ? onClear : onSelectAll}
      />
      <div className="text-textColor/70">
        {t('n_selected', 'Selected: {{n}}', { n: posts.length })}
      </div>
      <div className="flex-1" />
      <Button
        secondary
        className="rounded-[8px] !h-[34px] !px-[12px]"
        disabled={!hasSelection || onlyPublished || busy}
        onClick={changeStatus('draft')}
      >
        {t('move_to_draft', 'Move to draft')}
      </Button>
      <Button
        secondary
        className="rounded-[8px] !h-[34px] !px-[12px]"
        disabled={!hasSelection || onlyPublished || busy}
        onClick={changeStatus('schedule')}
      >
        {t('schedule', 'Schedule')}
      </Button>
      <Button
        secondary
        className="rounded-[8px] !h-[34px] !px-[12px]"
        disabled={!hasSelection || onlyPublished || busy}
        onClick={openReschedule}
      >
        {t('reschedule', 'Reschedule')}
      </Button>
      <Button
        className="!bg-red-700 rounded-[8px] !h-[34px] !px-[12px]"
        disabled={!hasSelection}
        loading={busy}
        onClick={deletePosts}
      >
        {t('delete', 'Delete')}
      </Button>
      <Button
        secondary
        className="rounded-[8px] !h-[34px] !px-[12px]"
        onClick={onCancel}
      >
        {t('cancel', 'Cancel')}
      </Button>
    </div>
  );
};
