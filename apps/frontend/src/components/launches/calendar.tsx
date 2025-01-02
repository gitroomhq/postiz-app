'use client';

import React, {
  FC, Fragment, memo, useCallback, useEffect, useMemo, useState
} from 'react';
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
import { groupBy, random, sortBy } from 'lodash';
import Image from 'next/image';
import { extend } from 'dayjs';
import { isUSCitizen } from './helpers/isuscitizen.utils';
import removeMd from 'remove-markdown';
import { useInterval } from '@mantine/hooks';
extend(isSameOrAfter);
extend(isSameOrBefore);

const convertTimeFormatBasedOnLocality = (time: number) => {
  if (isUSCitizen()) {
    return `${time === 12 ? 12 : time % 12}:00 ${time >= 12 ? 'PM' : 'AM'}`;
  } else {
    return `${time}:00`;
  }
};

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
              .format(isUSCitizen() ? 'hh:mm A' : 'HH:mm')}
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
                {/* {hour.toString().padStart(2, '0')}:00 */}
                {convertTimeFormatBasedOnLocality(hour)}
              </div>
              {days.map((day, indexDay) => (
                <Fragment key={`${currentYear}-${currentWeek}-${day}-${hour}`}>
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
    <>
      {display === 'day' ? (
        <DayView />
      ) : display === 'week' ? (
        <WeekView />
      ) : (
        <MonthView />
      )}
    </>
  );
};

export const CalendarColumn: FC<{
  getDate: dayjs.Dayjs;
  randomHour?: boolean;
}> = memo((props) => {
  const { getDate, randomHour } = props;
  const [num, setNum] = useState(0);

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

  const [showAll, setShowAll] = useState(false);
  const showAllFunc = useCallback(() => {
    setShowAll(true);
  }, []);

  const showLessFunc = useCallback(() => {
    setShowAll(false);
  }, []);

  const list = useMemo(() => {
    if (showAll) {
      return postList;
    }
    return postList.slice(0, 3);
  }, [postList, showAll]);

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
  }, [getDate, num]);

  const { start, stop } = useInterval(
    useCallback(() => {
      if (isBeforeNow) {
        return;
      }
      setNum(num + 1);
    }, [isBeforeNow]),
    random(120000, 150000)
  );

  useEffect(() => {
    start();

    return () => {
      stop();
    };
  }, []);

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
              allIntegrations: [],
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
    (post: Post & { integration: Integration }, isDuplicate?: boolean) =>
      async () => {
        if (user?.orgId === post.submittedForOrganizationId) {
          return previewPublication(post);
        }
        const data = await (await fetch(`/posts/${post.id}`)).json();
        const date = !isDuplicate
          ? null
          : (await (await fetch('/posts/find-slot')).json()).date;
        const publishDate = dayjs
          .utc(date || data.posts[0].publishDate)
          .local();

        const ExistingData = !isDuplicate
          ? ExistingDataContextProvider
          : Fragment;

        modal.openModal({
          closeOnClickOutside: false,
          closeOnEscape: false,
          withCloseButton: false,
          classNames: {
            modal: 'w-[100%] max-w-[1400px] bg-transparent text-textColor',
          },
          children: (
            <ExistingData value={data}>
              <AddEditModal
                {...(isDuplicate ? { onlyValues: data.posts } : {})}
                allIntegrations={integrations.map((p) => ({ ...p }))}
                reopenModal={editPost(post)}
                mutate={reloadCalendarView}
                integrations={
                  isDuplicate
                    ? integrations
                    : integrations
                        .slice(0)
                        .filter((f) => f.id === data.integration)
                        .map((p) => ({
                          ...p,
                          picture: data.integrationPicture,
                        }))
                }
                date={publishDate}
              />
            </ExistingData>
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
          allIntegrations={integrations.map((p) => ({ ...p }))}
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
          'relative flex flex-col flex-1 text-white',
          canDrop && 'bg-white/80',
          isBeforeNow && postList.length === 0 && 'cursor-not-allowed'
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
            'flex-col text-[12px] pointer w-full flex scrollbar scrollbar-thumb-tableBorder scrollbar-track-secondary',
            isBeforeNow ? 'bg-customColor23 flex-1' : 'cursor-pointer',
            isBeforeNow && postList.length === 0 && 'col-calendar',
            canBeTrending && 'bg-customColor24'
          )}
        >
          {list.map((post) => (
            <div
              key={post.id}
              className={clsx(
                'text-textColor p-[2.5px] relative flex flex-col justify-center items-center'
              )}
            >
              <div className="relative w-full flex flex-col items-center p-[2.5px] h-[66px]">
                <CalendarItem
                  display={display as 'day' | 'week' | 'month'}
                  isBeforeNow={isBeforeNow}
                  date={getDate}
                  state={post.state}
                  editPost={editPost(post, false)}
                  duplicatePost={editPost(post, true)}
                  post={post}
                  integrations={integrations}
                />
              </div>
            </div>
          ))}
          {!showAll && postList.length > 3 && (
            <div
              className="text-center hover:underline py-[5px]"
              onClick={showAllFunc}
            >
              + Show more ({postList.length - 3})
            </div>
          )}
          {showAll && postList.length > 3 && (
            <div
              className="text-center hover:underline py-[5px]"
              onClick={showLessFunc}
            >
              - Show less
            </div>
          )}
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
                    <div
                      className="relative"
                      key={selectedIntegrations.identifier}
                    >
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
});

const CalendarItem: FC<{
  date: dayjs.Dayjs;
  isBeforeNow: boolean;
  editPost: () => void;
  duplicatePost: () => void;
  integrations: Integrations[];
  state: State;
  display: 'day' | 'week' | 'month';
  post: Post & { integration: Integration };
}> = memo((props) => {
  const { editPost, duplicatePost, post, date, isBeforeNow, state, display } =
    props;

  const preview = useCallback(() => {
    window.open(`/p/` + post.id + '?share=true', '_blank');
  }, [post]);

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
      className={clsx('w-full flex h-full flex-1 flex-col group', 'relative')}
      style={{ opacity }}
    >
      <div className="bg-forth text-[11px] h-[15px] w-full rounded-tr-[10px] rounded-tl-[10px] flex justify-center gap-[10px] px-[5px]">
        <div
          className="hidden group-hover:block hover:underline cursor-pointer"
          onClick={duplicatePost}
        >
          Duplicate
        </div>
        <div
          className="hidden group-hover:block hover:underline cursor-pointer"
          onClick={preview}
        >
          Preview
        </div>
      </div>
      <div
        onClick={editPost}
        className={clsx(
          'gap-[5px] w-full flex h-full flex-1 rounded-br-[10px] rounded-bl-[10px] border border-seventh px-[5px] p-[2.5px]',
          'relative',
          isBeforeNow && '!grayscale'
        )}
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
        <div className="whitespace-nowrap line-clamp-2">
          <div className="text-left">{state === 'DRAFT' ? 'Draft: ' : ''}</div>
          <div className="w-full overflow-hidden overflow-ellipsis text-left">
            {removeMd(post.content).replace(/\n/g, ' ')}
          </div>
        </div>
      </div>
    </div>
  );
});
