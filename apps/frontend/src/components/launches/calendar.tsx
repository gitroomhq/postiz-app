'use client';

import React, { FC, Fragment, useCallback, useMemo } from 'react';
import {
  CalendarContext,
  Integrations,
  useCalendar,
} from '@gitroom/frontend/components/launches/calendar.context';
import dayjs from 'dayjs';
import { openModal, useModals } from '@mantine/modals';
import { AddEditModal } from '@gitroom/frontend/components/launches/add.edit.model';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { ExistingDataContextProvider } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { useDrag, useDrop } from 'react-dnd';
import { DNDProvider } from '@gitroom/frontend/components/launches/helpers/dnd.provider';
import { Integration, Post, State } from '@prisma/client';
import { useAddProvider } from '@gitroom/frontend/components/launches/add.provider.component';
import { CommentComponent } from '@gitroom/frontend/components/launches/comments/comment.component';
import { useSWRConfig } from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { IntegrationContext } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { PreviewPopup } from '@gitroom/frontend/components/marketplace/special.message';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { groupBy, sortBy } from 'lodash';
import Image from 'next/image';
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export const days = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
export const hours = Array.from({ length: 24 }, (_, i) => i);

export const DayView = () => {
  const calendar = useCalendar();
  const { integrations, posts, currentYear, currentDay, currentWeek } =
    calendar;

  const options = useMemo(() => {
    const createdPosts = posts.map((post) => ({
      integration: [integrations.find((i) => i.id === post.integration.id)!],
      image: post.integration.picture,
      identifier: post.integration.providerIdentifier,
      id: post.integration.id,
      name: post.integration.name,
      time: dayjs
        .utc(post.publishDate)
        .diff(dayjs.utc(post.publishDate).startOf('day'), 'minute'),
    }));

    return sortBy(
      Object.values(
        groupBy(
          [
            ...createdPosts,
            ...integrations.flatMap((p) =>
              p.time.flatMap((t) => ({
                integration: p,
                identifier: p.identifier,
                name: p.name,
                id: p.id,
                image: p.picture,
                time: t.time,
              }))
            ),
          ],
          (p: any) => p.time
        )
      ),
      (p) => p[0].time
    );
  }, [integrations, posts]);

  return (
    <div className="flex flex-col gap-[10px]">
      {options.map((option) => (
        <Fragment key={option[0].time}>
          <div className="text-center text-[20px]">
            {dayjs()
              .utc()
              .startOf('day')
              .add(option[0].time, 'minute')
              .local()
              .format('HH:mm')}
          </div>
          <div
            key={option[0].time}
            className="bg-secondary min-h-[60px] border-[2px] border-secondary rounded-[10px] flex justify-center items-center gap-[10px] mb-[20px]"
          >
            <CalendarContext.Provider
              value={{
                ...calendar,
                integrations: option.flatMap((p) => p.integration),
              }}
            >
              <CalendarColumn
                getDate={dayjs()
                  .utc()
                  .year(currentYear)
                  .week(currentWeek)
                  .day(currentDay)
                  .startOf('day')
                  .add(option[0].time, 'minute')
                  .local()}
              />
            </CalendarContext.Provider>
          </div>
        </Fragment>
      ))}
    </div>
  );
};

export const WeekView = () => {
  const { currentYear, currentWeek } = useCalendar();

  return (
    <div className="flex flex-col h-screen overflow-hidden text-textColor flex-1">
      <div className="flex-1">
        <div className="grid grid-cols-8 bg-customColor31 gap-[1px] border-customColor31 border rounded-[10px]">
          <div className="bg-customColor20 sticky top-0 z-10 bg-gray-900"></div>
          {days.map((day, index) => (
            <div
              key={day}
              className="sticky top-0 z-10 bg-customColor20 p-2 text-center"
            >
              <div>{day}</div>
            </div>
          ))}
          {hours.map((hour) => (
            <Fragment key={hour}>
              <div className="p-2 pr-4 bg-secondary text-center items-center justify-center flex">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {days.map((day, indexDay) => (
                <Fragment key={`${day}-${hour}`}>
                  <div className="relative bg-secondary">
                    <CalendarColumn
                      getDate={dayjs()
                        .year(currentYear)
                        .week(currentWeek)
                        .day(indexDay + 1)
                        .hour(hour)
                        .startOf('hour')}
                    />
                  </div>
                </Fragment>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export const MonthView = () => {
  const { currentYear, currentMonth } = useCalendar();

  const calendarDays = useMemo(() => {
    const startOfMonth = dayjs(new Date(currentYear, currentMonth, 1));

    // Calculate the day offset for Monday (isoWeekday() returns 1 for Monday)
    const startDayOfWeek = startOfMonth.isoWeekday(); // 1 for Monday, 7 for Sunday
    const daysBeforeMonth = startDayOfWeek - 1; // Days to show from the previous month

    // Get the start date (Monday of the first week that includes this month)
    const startDate = startOfMonth.subtract(daysBeforeMonth, 'day');

    // Create an array to hold the calendar days (6 weeks * 7 days = 42 days max)
    const calendarDays = [];
    let currentDay = startDate;

    for (let i = 0; i < 42; i++) {
      let label = 'current-month';
      if (currentDay.month() < currentMonth) label = 'previous-month';
      if (currentDay.month() > currentMonth) label = 'next-month';

      calendarDays.push({
        day: currentDay,
        label,
      });

      // Move to the next day
      currentDay = currentDay.add(1, 'day');
    }

    return calendarDays;
  }, [currentYear, currentMonth]);

  return (
    <div className="flex flex-col h-screen overflow-hidden text-textColor flex-1">
      <div className="flex-1 flex">
        <div className="grid grid-cols-7 grid-rows-[40px_auto] bg-customColor31 gap-[1px] border-customColor31 border rounded-[10px] flex-1">
          {days.map((day) => (
            <div
              key={day}
              className="sticky top-0 z-10 bg-customColor20 p-2 text-center"
            >
              <div>{day}</div>
            </div>
          ))}
          {calendarDays.map((date, index) => (
            <div
              key={index}
              className="bg-secondary text-center items-center justify-center flex min-h-[100px]"
            >
              <CalendarColumn
                getDate={dayjs(date.day).endOf('day')}
                randomHour={true}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const Calendar = () => {
  const { display } = useCalendar();

  return (
    <DNDProvider>
      {display === 'day' ? (
        <DayView />
      ) : display === 'week' ? (
        <WeekView />
      ) : (
        <MonthView />
      )}
    </DNDProvider>
  );
};

export const CalendarColumn: FC<{
  getDate: dayjs.Dayjs;
  randomHour?: boolean;
}> = (props) => {
  const { getDate, randomHour } = props;
  const user = useUser();
  const {
    integrations,
    posts,
    trendings,
    changeDate,
    display,
    reloadCalendarView,
  } = useCalendar();

  const toaster = useToaster();
  const modal = useModals();
  const fetch = useFetch();

  const postList = useMemo(() => {
    return posts.filter((post) => {
      const pList = dayjs.utc(post.publishDate).local();
      const check =
        display === 'day'
          ? pList.format('YYYY-MM-DD HH:mm') ===
            getDate.format('YYYY-MM-DD HH:mm')
          : display === 'week'
          ? pList.isSameOrAfter(getDate.startOf('hour')) &&
            pList.isBefore(getDate.endOf('hour'))
          : pList.format('DD/MM/YYYY') === getDate.format('DD/MM/YYYY');

      return check;
    });
  }, [posts, display, getDate]);

  const canBeTrending = useMemo(() => {
    return !!trendings.find((trend) => {
      return dayjs
        .utc(trend)
        .local()
        .isBetween(getDate, getDate.add(10, 'minute'), 'minute', '[)');
    });
  }, [trendings]);

  const isBeforeNow = useMemo(() => {
    return getDate.startOf('hour').isBefore(dayjs().startOf('hour'));
  }, [getDate]);

  const [{ canDrop }, drop] = useDrop(() => ({
    accept: 'post',
    drop: async (item: any) => {
      if (isBeforeNow) return;
      const { status } = await fetch(`/posts/${item.id}/date`, {
        method: 'PUT',
        body: JSON.stringify({
          date: getDate.utc().format('YYYY-MM-DDTHH:mm:ss'),
        }),
      });

      if (status !== 500) {
        changeDate(item.id, getDate);
        return;
      }

      toaster.show(
        "Can't change date, remove post from publication",
        'warning'
      );
    },
    collect: (monitor) => ({
      canDrop: isBeforeNow ? false : !!monitor.canDrop() && !!monitor.isOver(),
    }),
  }));

  const getIntegration = useCallback(
    async (post: Post & { integration: Integration }) => {
      return (
        await fetch(
          `/integrations/${post.integration.id}?order=${post.submittedForOrderId}`,
          {
            method: 'GET',
          }
        )
      ).json();
    },
    []
  );

  const previewPublication = useCallback(
    async (postInfo: Post & { integration: Integration }) => {
      const post = await (
        await fetch(`/marketplace/posts/${postInfo.id}`)
      ).json();

      const integration = await getIntegration(postInfo);
      modal.openModal({
        classNames: {
          modal: 'bg-transparent text-textColor',
        },
        size: 'auto',
        withCloseButton: false,
        children: (
          <IntegrationContext.Provider
            value={{
              date: dayjs(),
              integration,
              value: [],
            }}
          >
            <PreviewPopup
              providerId={post?.providerId!}
              post={post}
              postId={post.id}
            />
          </IntegrationContext.Provider>
        ),
      });
    },
    []
  );

  const editPost = useCallback(
    (post: Post & { integration: Integration }) => async () => {
      if (user?.orgId === post.submittedForOrganizationId) {
        return previewPublication(post);
      }
      const data = await (await fetch(`/posts/${post.id}`)).json();
      const publishDate = dayjs.utc(data.posts[0].publishDate).local();

      modal.openModal({
        closeOnClickOutside: false,
        closeOnEscape: false,
        withCloseButton: false,
        classNames: {
          modal: 'w-[100%] max-w-[1400px] bg-transparent text-textColor',
        },
        children: (
          <ExistingDataContextProvider value={data}>
            <AddEditModal
              reopenModal={editPost(post)}
              mutate={reloadCalendarView}
              integrations={integrations
                .slice(0)
                .filter((f) => f.id === data.integration)
                .map((p) => ({ ...p, picture: data.integrationPicture }))}
              date={publishDate}
            />
          </ExistingDataContextProvider>
        ),
        size: '80%',
        title: ``,
      });
    },
    [integrations]
  );

  const addModal = useCallback(() => {
    modal.openModal({
      closeOnClickOutside: false,
      closeOnEscape: false,
      withCloseButton: false,
      classNames: {
        modal: 'w-[100%] max-w-[1400px] bg-transparent text-textColor',
      },
      children: (
        <AddEditModal
          integrations={integrations.slice(0).map((p) => ({ ...p }))}
          mutate={reloadCalendarView}
          date={
            randomHour ? getDate.hour(Math.floor(Math.random() * 24)) : getDate
          }
          reopenModal={() => ({})}
        />
      ),
      size: '80%',
      // title: `Adding posts for ${getDate.format('DD/MM/YYYY HH:mm')}`,
    });
  }, [integrations, getDate]);

  const addProvider = useAddProvider();

  return (
    <div className="flex flex-col w-full min-h-full" ref={drop as any}>
      {display === 'month' && (
        <div className={clsx('pt-[5px]', isBeforeNow && 'bg-customColor23')}>
          {getDate.date()}
        </div>
      )}
      <div
        className={clsx(
          'relative flex flex-col flex-1',
          canDrop && 'bg-white/80'
        )}
      >
        <div
          {...(canBeTrending
            ? {
                'data-tooltip-id': 'tooltip',
                'data-tooltip-content': 'Predicted GitHub Trending Change',
              }
            : {})}
          className={clsx(
            'flex-col text-[12px] pointer w-full cursor-pointer overflow-hidden overflow-x-auto flex scrollbar scrollbar-thumb-tableBorder scrollbar-track-secondary',
            isBeforeNow && 'bg-customColor23 flex-1',
            canBeTrending && 'bg-customColor24'
          )}
        >
          {postList.map((post) => (
            <div
              key={post.id}
              className={clsx(
                'text-textColor p-[2.5px] relative flex flex-col justify-center items-center'
              )}
            >
              <div className="relative w-full flex flex-col items-center p-[2.5px]">
                <CalendarItem
                  display={display as 'day' | 'week' | 'month'}
                  isBeforeNow={isBeforeNow}
                  date={getDate}
                  state={post.state}
                  editPost={editPost(post)}
                  post={post}
                  integrations={integrations}
                />
              </div>
            </div>
          ))}
        </div>
        {(display === 'day'
          ? !isBeforeNow && postList.length === 0
          : !isBeforeNow) && (
          <div
            className="pb-[2.5px] px-[5px] flex-1 flex"
            onClick={integrations.length ? addModal : addProvider}
          >
            <div
              className={clsx(
                display === ('month' as any)
                  ? 'flex-1 min-h-[40px] w-full'
                  : !postList.length
                  ? 'h-full w-full absolute left-0 top-0 p-[5px]'
                  : 'min-h-[40px] w-full',
                'flex items-center justify-center cursor-pointer pb-[2.5px]'
              )}
            >
              {display !== 'day' && (
                <div
                  className={clsx(
                    'hover:before:content-["+"] w-full h-full text-seventh rounded-[10px] hover:border hover:border-seventh flex justify-center items-center'
                  )}
                />
              )}
              {display === 'day' && (
                <div
                  className={`w-full h-full rounded-[10px] hover:border hover:border-seventh flex justify-center items-center gap-[20px] opacity-30 grayscale hover:grayscale-0 hover:opacity-100`}
                >
                  {integrations.map((selectedIntegrations) => (
                    <div className="relative" key={selectedIntegrations.identifier}>
                      <div
                        className={clsx(
                          'relative w-[34px] h-[34px] rounded-full flex justify-center items-center bg-fifth filter transition-all duration-500'
                        )}
                      >
                        <Image
                          src={selectedIntegrations.picture}
                          className="rounded-full"
                          alt={selectedIntegrations.identifier}
                          width={32}
                          height={32}
                        />
                        {selectedIntegrations.identifier === 'youtube' ? (
                          <img
                            src="/icons/platforms/youtube.svg"
                            className="absolute z-10 -bottom-[5px] -right-[5px]"
                            width={20}
                          />
                        ) : (
                          <Image
                            src={`/icons/platforms/${selectedIntegrations.identifier}.png`}
                            className="rounded-full absolute z-10 -bottom-[5px] -right-[5px] border border-fifth"
                            alt={selectedIntegrations.identifier}
                            width={20}
                            height={20}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CalendarItem: FC<{
  date: dayjs.Dayjs;
  isBeforeNow: boolean;
  editPost: () => void;
  integrations: Integrations[];
  state: State;
  display: 'day' | 'week' | 'month';
  post: Post & { integration: Integration };
}> = (props) => {
  const { editPost, post, date, isBeforeNow, state, display } = props;
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
      // @ts-ignore
      ref={dragRef}
      onClick={editPost}
      className={clsx(
        'gap-[5px] w-full flex h-full flex-1 rounded-[10px] border border-seventh px-[5px] p-[2.5px]',
        'relative',
        (state === 'DRAFT' || isBeforeNow) && '!grayscale'
      )}
      style={{ opacity }}
    >
      <div
        className={clsx(
          'relative min-w-[20px] h-[20px]',
          display === 'day' ? 'h-[40px]' : 'h-[20px]'
        )}
      >
        <img
          className="w-[20px] h-[20px] rounded-full"
          src={post.integration.picture!}
        />
        <img
          className="w-[12px] h-[12px] rounded-full absolute z-10 top-[10px] right-0 border border-fifth"
          src={`/icons/platforms/${post.integration?.providerIdentifier}.png`}
        />
      </div>
      <div className="whitespace-pre-wrap line-clamp-3">
        {state === 'DRAFT' ? 'Draft: ' : ''}
        {post.content}
      </div>
    </div>
  );
};

export const CommentBox: FC<{ totalComments: number; date: dayjs.Dayjs }> = (
  props
) => {
  const { totalComments, date } = props;
  const { mutate } = useSWRConfig();

  const openCommentsModal = useCallback(() => {
    openModal({
      children: <CommentComponent date={date} />,
      withCloseButton: false,
      onClose() {
        mutate(`/posts`);
      },
      classNames: {
        modal: 'bg-transparent text-textColor',
      },
      size: '80%',
    });
  }, [date]);

  return (
    <div
      className={
        totalComments === 0
          ? 'transition-opacity opacity-0 group-hover:opacity-100'
          : ''
      }
    >
      <div
        onClick={openCommentsModal}
        data-tooltip-id="tooltip"
        data-tooltip-content="Add / View comments"
        className={clsx(
          'group absolute right-0 bottom-0 w-[20px] h-[20px] z-[10] hover:opacity-95 cursor-pointer hover:right-[3px] hover:bottom-[3px] transition-all duration-300 ease-in-out',
          totalComments === 0 ? 'opacity-50' : 'opacity-95'
        )}
      >
        <div
          className={clsx(
            'relative w-full h-full group-hover:opacity-100',
            totalComments === 0 && 'opacity-0'
          )}
        >
          {totalComments > 0 && (
            <div className="absolute right-0 bottom-[10px] w-[10px] h-[10px] text-[8px] bg-red-500 z-[20] rounded-full flex justify-center items-center text-textColor">
              {totalComments}
            </div>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 32 32"
            id="comment"
          >
            <path
              fill="#fff"
              d="M25.784 21.017A10.992 10.992 0 0 0 27 16c0-6.065-4.935-11-11-11S5 9.935 5 16s4.935 11 11 11c1.742 0 3.468-.419 5.018-1.215l4.74 1.185a.996.996 0 0 0 .949-.263 1 1 0 0 0 .263-.95l-1.186-4.74zm-2.033.11.874 3.498-3.498-.875a1.006 1.006 0 0 0-.731.098A8.99 8.99 0 0 1 16 25c-4.963 0-9-4.038-9-9s4.037-9 9-9 9 4.038 9 9a8.997 8.997 0 0 1-1.151 4.395.995.995 0 0 0-.098.732z"
            ></path>
          </svg>
        </div>
        <div className="absolute right-0 bottom-0 w-[0] h-[0] shadow-yellow bg-[rgba(0,0,0,0)]"></div>
      </div>
    </div>
  );
};
