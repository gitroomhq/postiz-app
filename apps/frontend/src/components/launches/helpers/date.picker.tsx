import { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import dayjs from 'dayjs';
// Aliased: this module exports its own `DatePicker`, which is the whole popover
// below, not the month grid inside it.
import { DatePicker as MantineDatePicker, TimeInput } from '@mantine/dates';
import { useClickOutside } from '@mantine/hooks';
import { Button } from '@gitroom/react/form/button';
import { useDateFormat } from './date.format';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { CalendarIcon } from '@gitroom/frontend/components/ui/icons';
import { useAnchoredPopover } from '@gitroom/frontend/components/layout/use.anchored.popover';

/**
 * The three day states the old `dayClassName` branched on, expressed against
 * the data attributes Mantine 9 puts on each day. Colours are unchanged from
 * that branch, deliberately: this is a library migration, not a restyle.
 *
 * The selected day is missing on purpose — Mantine paints it with its primary
 * colour, which `global.css` maps to `--brand`.
 */
const DAY_CLASSNAMES = [
  'text-pqText hover:bg-pqHover',
  'data-[weekend]:!text-customColor28',
  'data-[outside]:!text-gray',
].join(' ');

export const DatePicker: FC<{
  date: dayjs.Dayjs;
  onChange: (day: dayjs.Dayjs) => void;
  className?: string;
}> = (props) => {
  const { date, onChange, className } = props;
  const [open, setOpen] = useState(false);
  const t = useT();
  const { dateTimePattern } = useDateFormat();
  // Fixed positioning escapes Create Post footer's overflow-y-hidden and the
  // shell's overflow-hidden (absolute bottom-[100%] was clipped behind chrome).
  const { referenceRef, floatingRef } = useAnchoredPopover<
    HTMLDivElement,
    HTMLDivElement
  >(open, 'start', { offsetPx: 16, placement: 'top' });

  const changeShow = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);
  const ref = useClickOutside<HTMLDivElement>(() => {
    setOpen(false);
  });
  // Mantine 9 hands both of these back as strings — `YYYY-MM-DD` from the
  // picker, `HH:mm` from the time input — where 5 passed a Date. The halves are
  // still recombined exactly as before; only the parsing on the way in is gone.
  const changeDate = useCallback(
    (type: 'date' | 'time') => (value: string | null) => {
      if (!value) {
        return;
      }
      onChange(
        newDayjs(
          type === 'time'
            ? date.format('YYYY-MM-DD') + ' ' + value
            : value + ' ' + date.format('HH:mm:ss')
        )
      );
    },
    [date, onChange]
  );
  return (
    <div
      className={clsx(
        'relative ml-[7px] flex h-[44px] min-w-0 select-none items-center justify-center gap-[8px] overflow-hidden rounded-[8px] border border-newTextColor/10 px-[16px] text-[15px] font-[600]',
        'max-[1179px]:ml-0 max-[1179px]:w-full max-[1179px]:flex-none',
        'min-[1180px]:flex-1',
        className
      )}
      ref={ref}
    >
      <div
        className="flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-[8px]"
        onClick={changeShow}
        ref={referenceRef}
      >
        <div className="shrink-0">
          <CalendarIcon />
        </div>
        <div className="min-w-0 truncate whitespace-nowrap tabular-nums">
          {date.format(dateTimePattern())}
        </div>
      </div>
      {open && (
        <div
          ref={floatingRef}
          onClick={(e) => e.stopPropagation()}
          className="animate-fadeIn z-[300] flex flex-col rounded-[16px] border border-pqBorder bg-pqPop p-[16px] text-pqText shadow-pqE2"
        >
          <MantineDatePicker
            onChange={changeDate('date')}
            value={date.format('YYYY-MM-DD')}
            classNames={{
              // `dayClassName(date, modifiers)` is gone in 9. The same three
              // states are data attributes on the day now, so they are styled
              // rather than branched on — and the selected day is painted by
              // Mantine's primary colour, which global.css points at --brand.
              day: DAY_CLASSNAMES,
              calendarHeaderControl: 'text-pqText hover:bg-pqHover',
              calendarHeaderLevel: 'text-pqText hover:bg-pqHover',
            }}
          />
          <TimeInput
            onChange={(event) => changeDate('time')(event.currentTarget.value)}
            label="Pick time"
            classNames={{
              label: 'text-pqMuted py-[12px]',
              input:
                'bg-pqTableHeader h-[40px] border-0 text-pqText rounded-[10px] outline-none shadow-[inset_0_0_0_1px_var(--border)]',
            }}
            defaultValue={date.format('HH:mm')}
          />
          <Button className="mt-[12px]" onClick={changeShow}>
            {t('close', 'Close')}
          </Button>
        </div>
      )}
    </div>
  );
};
