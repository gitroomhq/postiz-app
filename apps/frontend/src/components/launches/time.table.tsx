'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import dayjs from 'dayjs';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { Select } from '@gitroom/react/form/select';
import { Button } from '@gitroom/react/form/button';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
// @ts-ignore
import useKeypress from 'react-use-keypress';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { sortBy } from 'lodash';
import { usePreventWindowUnload } from '@gitroom/react/helpers/use.prevent.window.unload';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import clsx from 'clsx';
import {
  TrashIcon,
  PlusIcon,
  DelayIcon,
} from '@gitroom/frontend/components/ui/icons';

dayjs.extend(utc);
dayjs.extend(timezone);

const hours = [...Array(24).keys()].map((i) => ({
  value: i,
}));

const minutes = [...Array(60).keys()].map((i) => ({
  value: i,
}));

export const TimeTable: FC<{
  integration: Integrations;
  mutate: () => void;
}> = (props) => {
  const t = useT();
  const {
    integration: { time },
    mutate,
  } = props;
  const [currentTimes, setCurrentTimes] = useState([...time]);
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);
  const fetch = useFetch();
  const modal = useModals();
  usePreventWindowUnload(true);

  const askClose = useCallback(async () => {
    if (
      !(await deleteDialog(
        t(
          'are_you_sure_you_want_to_close_the_window',
          'Are you sure you want to close the window?'
        ),
        t('yes_close', 'Yes, close')
      ))
    ) {
      return;
    }
    modal.closeAll();
  }, []);

  useKeypress('Escape', askClose);

  const removeSlot = useCallback(
    (index: number) => async () => {
      if (
        !(await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete_this_slot',
            'Are you sure you want to delete this slot?'
          )
        ))
      ) {
        return;
      }
      setCurrentTimes((prev) => prev.filter((_, i) => i !== index));
    },
    []
  );

  const addHour = useCallback(() => {
    const calculateMinutes =
      newDayjs()
        .utc()
        .startOf('day')
        .add(hour, 'hours')
        .add(minute, 'minutes')
        .diff(newDayjs().utc().startOf('day'), 'minutes') -
      dayjs.tz().utcOffset();
    setCurrentTimes((prev) => [
      ...prev,
      {
        time: calculateMinutes,
      },
    ]);
  }, [hour, minute]);

  const times = useMemo(() => {
    return sortBy(
      currentTimes.map(({ time }) => ({
        value: time,
        formatted: dayjs
          .utc()
          .startOf('day')
          .add(time, 'minutes')
          .local()
          .format('HH:mm'),
      })),
      (p) => p.value
    );
  }, [currentTimes]);

  const save = useCallback(async () => {
    await fetch(`/integrations/${props.integration.id}/time`, {
      method: 'POST',
      body: JSON.stringify({
        time: currentTimes,
      }),
    });
    mutate();
    modal.closeAll();
  }, [currentTimes]);

  return (
    <div className="relative w-full max-w-[400px] mx-auto">
      {/* Add Time Slot Section */}
      <div className="rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(30,41,59,0.6),rgba(15,23,42,0.9))] p-[20px] shadow-[0_24px_60px_rgba(2,6,23,0.22)] backdrop-blur-xl">
        <div className="mb-[16px] flex items-center gap-[8px] text-[15px] font-semibold text-textColor">
          <DelayIcon size={18} className="text-[#38bdf8]" />
          {t('add_time_slot', 'Add Time Slot')}
        </div>

        <div className="flex gap-[12px] items-end">
          <div className="flex-1">
            <Select
              label={t('hour', 'Hour')}
              name="hour"
              disableForm={true}
              hideErrors={true}
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
            >
              {hours.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.value.toString().padStart(2, '0')}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1">
            <Select
              label={t('minutes', 'Minutes')}
              name="minutes"
              disableForm={true}
              hideErrors={true}
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
            >
              {minutes.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.value.toString().padStart(2, '0')}
                </option>
              ))}
            </Select>
          </div>
          <button
            type="button"
            onClick={addHour}
            className="flex h-[42px] items-center gap-[6px] rounded-[12px] bg-[linear-gradient(135deg,#38bdf8,#a78bfa)] px-[16px] text-[14px] font-semibold text-[#0a0e1a] shadow-[0_16px_32px_rgba(56,189,248,0.18)] transition-all hover:-translate-y-[1px] hover:shadow-[0_20px_36px_rgba(56,189,248,0.24)]"
          >
            <PlusIcon size={14} />
            {t('add', 'Add')}
          </button>
        </div>
      </div>

      {/* Time Slots List */}
      <div className="mt-[20px]">
        <div className="mb-[12px] text-[12px] font-[600] uppercase tracking-[0.08em] text-textColor/55">
          {t('scheduled_times', 'Scheduled Times')} ({times.length})
        </div>

        {times.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-white/10 bg-[rgba(15,23,42,0.42)] py-[32px] text-center text-[14px] text-textColor/40">
            {t('no_time_slots', 'No time slots added yet')}
          </div>
        ) : (
          <div className="flex flex-col gap-[8px]">
            {times.map((timeSlot, index) => (
              <div
                key={`${timeSlot.value}-${index}`}
                className={clsx(
                  'group flex items-center justify-between',
                  'h-[48px] px-[16px] rounded-[14px]',
                  'border border-white/8 bg-[linear-gradient(180deg,rgba(30,41,59,0.56),rgba(15,23,42,0.84))]',
                  'transition-all hover:border-[#38bdf8]/35 hover:bg-[linear-gradient(180deg,rgba(51,65,85,0.65),rgba(15,23,42,0.92))] hover:shadow-[0_16px_32px_rgba(56,189,248,0.08)]'
                )}
              >
                <div className="flex items-center gap-[12px]">
                  <div className="h-[8px] w-[8px] rounded-full bg-[#38bdf8] shadow-[0_0_10px_rgba(56,189,248,0.7)]" />
                  <span className="tabular-nums text-[15px] font-medium text-textColor">
                    {timeSlot.formatted}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={removeSlot(index)}
                  className="rounded-[10px] p-[8px] text-red-300/70 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="mt-[24px]">
        <Button type="button" className="w-full rounded-[12px]" onClick={save}>
          {t('save_changes', 'Save Changes')}
        </Button>
      </div>
    </div>
  );
};
