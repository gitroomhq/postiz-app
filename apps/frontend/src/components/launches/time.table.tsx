import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import React, { FC, Fragment, useCallback, useMemo, useState } from 'react';
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
import { useModals } from '@mantine/modals';
import { sortBy } from 'lodash';
import { usePreventWindowUnload } from '@gitroom/react/helpers/use.prevent.window.unload';

import { ReactComponent as CloseXSvg } from '@gitroom/frontend/assets/close-x.svg';

dayjs.extend(utc);
dayjs.extend(timezone);

const hours = [...Array(24).keys()].map((i, index) => ({
  value: index,
}));

const minutes = [...Array(60).keys()].map((i, index) => ({
  value: index,
}));

export const TimeTable: FC<{
  integration: Integrations;
  mutate: () => void;
}> = (props) => {
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
        'Are you sure you want to close the window?',
        'Yes, close'
      ))
    ) {
      return;
    }

    modal.closeAll();
  }, []);

  useKeypress('Escape', askClose);

  const removeSlot = useCallback(
    (index: number) => async () => {
      if (!(await deleteDialog('Are you sure you want to delete this slot?'))) {
        return;
      }
      setCurrentTimes((prev) => prev.filter((_, i) => i !== index));
    },
    []
  );

  const addHour = useCallback(() => {
    const calculateMinutes =
      dayjs()
        .utc()
        .startOf('day')
        .add(hour, 'hours')
        .add(minute, 'minutes')
        .diff(dayjs().utc().startOf('day'), 'minutes') - dayjs.tz().utcOffset();
    setCurrentTimes((prev) => [...prev, { time: calculateMinutes }]);
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
      body: JSON.stringify({ time: currentTimes }),
    });
    mutate();
    modal.closeAll();
  }, [currentTimes]);

  return (
    <div className="rounded-[4px] border border-customColor6 bg-sixth px-[16px] pb-[16px] relative w-full">
      <TopTitle title={`Time Table Slots`} />
      <button
        onClick={askClose}
        className="outline-none absolute right-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
        type="button"
      >
        <CloseXSvg />
      </button>

      <div>
        <div className="text-[16px] font-bold mt-[16px]">Add Time Slot</div>
        <div className="flex flex-col">
          <div className="mt-[16px] flex justify-center gap-[16px]">
            <div className="w-[100px]">
              <Select
                label="Hour"
                name="hour"
                disableForm={true}
                className="w-[100px] mt-[8px]"
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
              >
                {hours.map((hour) => (
                  <option key={hour.value} value={hour.value}>
                    {hour.value.toString().length === 1 ? '0' : ''}
                    {hour.value}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-[100px]">
              <Select
                label="Minutes"
                name="minutes"
                disableForm={true}
                className="w-[100px] mt-[8px]"
                value={minute}
                onChange={(e) => setMinute(Number(e.target.value))}
              >
                {minutes.map((minute) => (
                  <option key={minute.value} value={minute.value}>
                    {minute.value.toString().length === 1 ? '0' : ''}
                    {minute.value}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex w-[215px] mx-auto justify-center mb-[50px]">
            <Button type="button" className="w-full" onClick={addHour}>
              Add Slot
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-[16px] grid grid-cols-2 place-items-center w-[100px] mx-auto">
        {times.map((timeSlot, index) => (
          <Fragment key={timeSlot.formatted}>
            <div className="text-left w-full">{timeSlot.formatted}</div>
            <div
              className="cursor-pointer text-red-400 text-left w-full"
              onClick={removeSlot(index)}
            >
              X
            </div>
          </Fragment>
        ))}
      </div>
      <div className="flex w-[215px] mx-auto justify-center mb-[50px]">
        <Button type="button" className="w-full" onClick={save}>
          Save
        </Button>
      </div>
    </div>
  );
};
