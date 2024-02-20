'use client';

import { FC, useCallback, useMemo } from 'react';
import {
  Integrations,
  useCalendar,
} from '@gitroom/frontend/components/launches/calendar.context';
import dayjs from 'dayjs';
import { useModals } from '@mantine/modals';
import { AddEditModal } from '@gitroom/frontend/components/launches/add.edit.model';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { ExistingDataContextProvider } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { useDrag, useDrop } from 'react-dnd';
import { DNDProvider } from '@gitroom/frontend/components/launches/helpers/dnd.provider';
import { Integration, Post } from '@prisma/client';

const days = [
  '',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const hours = [
  '00:00',
  '01:00',
  '02:00',
  '03:00',
  '04:00',
  '05:00',
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
  '23:00',
];

const CalendarItem: FC<{
  date: dayjs.Dayjs;
  editPost: () => void;
  integrations: Integrations[];
  post: Post & { integration: Integration };
}> = (props) => {
  const { editPost, post, date, integrations } = props;
  const [{ opacity }, dragRef] = useDrag(
    () => ({
      type: 'post',
      item: { id: post.id, date },
      collect: (monitor) => ({
        opacity: monitor.isDragging() ? 0 : 1,
      }),
    }),
    []
  );
  return (
    <div
      ref={dragRef}
      onClick={editPost}
      className="relative"
      data-tooltip-id="tooltip"
      style={{ opacity }}
      data-tooltip-content={`${
        integrations.find(
          (p) => p.identifier === post.integration?.providerIdentifier
        )?.name
      }: ${post.content.slice(0, 100)}`}
    >
      <img
        className="w-[20px] h-[20px] rounded-full"
        src={
          integrations.find(
            (p) => p.identifier === post.integration?.providerIdentifier
          )?.picture!
        }
      />
      <img
        className="w-[12px] h-[12px] rounded-full absolute z-10 bottom-[0] right-0 border border-fifth"
        src={`/icons/platforms/${post.integration?.providerIdentifier}.png`}
      />
    </div>
  );
};

const CalendarColumn: FC<{ day: number; hour: string }> = (props) => {
  const { day, hour } = props;
  const { currentWeek, integrations, posts, changeDate } = useCalendar();
  const modal = useModals();
  const fetch = useFetch();

  const getDate = useMemo(() => {
    const date =
      dayjs().isoWeek(currentWeek).isoWeekday(day).format('YYYY-MM-DD') +
      'T' +
      hour +
      ':00';
    return dayjs(date);
  }, [currentWeek]);

  const postList = useMemo(() => {
    return posts.filter((post) => {
      return dayjs(post.publishDate).local().isSame(getDate);
    });
  }, [posts]);

  const isBeforeNow = useMemo(() => {
    return getDate.isBefore(dayjs());
  }, [getDate]);

  const [{ canDrop }, drop] = useDrop(() => ({
    accept: 'post',
    drop: (item: any) => {
      if (isBeforeNow) return;
      fetch(`/posts/${item.id}/date`, {
        method: 'PUT',
        body: JSON.stringify({ date: getDate.utc().format('YYYY-MM-DDTHH:mm:ss') }),
      });
      changeDate(item.id, getDate);
    },
    collect: (monitor) => ({
      canDrop: isBeforeNow ? false : !!monitor.canDrop() && !!monitor.isOver(),
    }),
  }));

  const editPost = useCallback(
    (id: string) => async () => {
      const data = await (await fetch(`/posts/${id}`)).json();

      modal.openModal({
        closeOnClickOutside: false,
        closeOnEscape: false,
        withCloseButton: false,
        children: (
          <ExistingDataContextProvider value={data}>
            <AddEditModal
              integrations={integrations.filter(
                (f) => f.id === data.integration
              )}
              date={getDate}
            />
          </ExistingDataContextProvider>
        ),
        size: '80%',
        title: `Edit post for ${getDate.format('DD/MM/YYYY HH:mm')}`,
      });
    },
    []
  );

  const addModal = useCallback(() => {
    modal.openModal({
      closeOnClickOutside: false,
      closeOnEscape: false,
      withCloseButton: false,
      children: <AddEditModal integrations={integrations} date={getDate} />,
      size: '80%',
      title: `Adding posts for ${getDate.format('DD/MM/YYYY HH:mm')}`,
    });
  }, []);

  return (
    <div className="relative w-full h-full">
      <div className="absolute left-0 top-0 w-full h-full">
        <div
          ref={drop}
          className={clsx(
            'h-[calc(216px/6)] text-[12px] pointer w-full overflow-hidden justify-center overflow-x-auto flex scrollbar scrollbar-thumb-tableBorder scrollbar-track-secondary',
            isBeforeNow && 'bg-secondary',
            canDrop && 'bg-white/80'
          )}
        >
          {postList.map((post) => (
            <div
              key={post.id}
              className={clsx(
                postList.length > 1 && 'w-[33px] basis-[28px]',
                'h-full text-white relative  flex justify-center items-center flex-grow-0 flex-shrink-0'
              )}
            >
              <div className="relative flex gap-[5px] items-center">
                <CalendarItem
                  date={getDate}
                  editPost={editPost(post.id)}
                  post={post}
                  integrations={integrations}
                />
              </div>
            </div>
          ))}
          {!isBeforeNow && (
            <div
              className={clsx(
                !postList.length ? 'justify-center flex-1' : 'ml-[2px]',
                'flex items-center cursor-pointer'
              )}
            >
              <div
                data-tooltip-id="tooltip"
                data-tooltip-content={
                  'Schedule for ' + getDate.format('DD/MM/YYYY HH:mm')
                }
                onClick={addModal}
                className={clsx(
                  'w-[20px] h-[20px] bg-forth rounded-full flex justify-center items-center hover:bg-seventh'
                )}
              >
                +
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const Calendar = () => {
  return (
    <DNDProvider>
      <div>
        <div className="grid grid-cols-8 text-center border-tableBorder border-r">
          {days.map((day) => (
            <div
              className="border-tableBorder border-l border-b h-[36px] border-t flex items-center justify-center bg-input text-[14px] sticky top-0 z-[100]"
              key={day}
            >
              {day}
            </div>
          ))}
          {hours.map((hour) =>
            days.map((day, index) => (
              <>
                {index === 0 ? (
                  <div
                    className="border-tableBorder border-l border-b h-[216px]"
                    key={day + hour}
                  >
                    {['00', '10', '20', '30', '40', '50'].map((num) => (
                      <div
                        key={day + hour + num}
                        className="h-[calc(216px/6)] text-[12px] flex justify-center items-center"
                      >
                        {hour.split(':')[0] + ':' + num}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="border-tableBorder border-l border-b h-[216px] flex flex-col"
                    key={day + hour}
                  >
                    {['00', '10', '20', '30', '40', '50'].map((num) => (
                      <CalendarColumn
                        key={day + hour + num}
                        day={index}
                        hour={hour.split(':')[0] + ':' + num}
                      />
                    ))}
                  </div>
                )}
              </>
            ))
          )}
        </div>
      </div>
    </DNDProvider>
  );
};
