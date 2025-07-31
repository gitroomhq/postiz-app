'use client';

import React, {
  FC,
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  CalendarContext,
  Integrations,
  useCalendar,
} from '@gitroom/frontend/components/launches/calendar.context';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/he';
import 'dayjs/locale/ru';
import 'dayjs/locale/zh';
import 'dayjs/locale/fr';
import 'dayjs/locale/es';
import 'dayjs/locale/pt';
import 'dayjs/locale/de';
import 'dayjs/locale/it';
import 'dayjs/locale/ja';
import 'dayjs/locale/ko';
import 'dayjs/locale/ar';
import 'dayjs/locale/tr';
import 'dayjs/locale/vi';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { useModals } from '@mantine/modals';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { ExistingDataContextProvider } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { useDrag, useDrop } from 'react-dnd';
import { Integration, Post, State, Tags } from '@prisma/client';
import { useAddProvider } from '@gitroom/frontend/components/launches/add.provider.component';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { groupBy, random, sortBy } from 'lodash';
import Image from 'next/image';
import { extend } from 'dayjs';
import { isUSCitizen } from './helpers/isuscitizen.utils';
import { useInterval } from '@mantine/hooks';
import { StatisticsModal } from '@gitroom/frontend/components/launches/statistics';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import i18next from 'i18next';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { ModalWrapperComponent } from '../new-launch/modal.wrapper.component';

// Extend dayjs with necessary plugins
extend(isSameOrAfter);
extend(isSameOrBefore);
extend(localizedFormat);

// Initialize language
const updateDayjsLocale = () => {
  const currentLanguage = i18next.resolvedLanguage || 'en';
  dayjs.locale(currentLanguage);
};

// Set dayjs locale whenever i18next language changes
i18next.on('languageChanged', () => {
  updateDayjsLocale();
});

// Initial setup
updateDayjsLocale();

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
export const hours = Array.from(
  {
    length: 24,
  },
  (_, i) => i
);
export const DayView = () => {
  const calendar = useCalendar();
  const { integrations, posts, startDate } = calendar;

  // Set dayjs locale based on current language
  const currentLanguage = i18next.resolvedLanguage || 'en';
  dayjs.locale(currentLanguage);

  const currentDay = dayjs.utc(startDate);

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
    <div className="flex flex-col gap-[10px] flex-1">
      {options.map((option) => (
        <Fragment key={option[0].time}>
          <div className="text-center text-[14px]">
            {dayjs()
              .utc()
              .startOf('day')
              .add(option[0].time, 'minute')
              .local()
              .format(isUSCitizen() ? 'hh:mm A' : 'LT')}
          </div>
          <div
            key={option[0].time}
            className="min-h-[60px] rounded-[10px] flex justify-center items-center gap-[10px] mb-[20px]"
          >
            <CalendarContext.Provider
              value={{
                ...calendar,
                integrations: option.flatMap((p) => p.integration),
              }}
            >
              <CalendarColumn
                getDate={currentDay
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
  const { startDate, endDate } = useCalendar();
  const t = useT();

  // Use dayjs to get localized day names
  const localizedDays = useMemo(() => {
    const currentLanguage = i18next.resolvedLanguage || 'en';
    dayjs.locale(currentLanguage);

    const days = [];
    const weekStart = dayjs(startDate);
    for (let i = 0; i < 7; i++) {
      const day = weekStart.add(i, 'day');
      days.push({
        name: day.format('dddd'),
        day: day.format('L'),
        date: day,
      });
    }
    return days;
  }, [i18next.resolvedLanguage, startDate]);

  return (
    <div className="flex flex-col text-textColor flex-1">
      <div className="flex-1">
        <div className="grid [grid-template-columns:136px_repeat(7,_minmax(0,_1fr))] gap-[4px] rounded-[10px]">
          <div className="z-10 bg-newTableHeader flex justify-center items-center flex-col h-[62px] rounded-[8px]"></div>
          {localizedDays.map((day, index) => (
            <div
              key={day.name}
              className="z-10 p-2 text-center bg-newTableHeader flex justify-center items-center flex-col h-[62px] rounded-[8px]"
            >
              <div className="text-[14px] font-[500] text-newTableText">
                {day.name}
              </div>
              <div
                className={clsx(
                  'text-[14px] font-[600] flex items-center justify-center gap-[6px]',
                  day.day === dayjs().format('L') && 'text-newTableTextFocused'
                )}
              >
                {day.day === dayjs().format('L') && (
                  <div className="w-[6px] h-[6px] bg-newTableTextFocused rounded-full" />
                )}
                {day.day}
              </div>
            </div>
          ))}
          {hours.map((hour) => (
            <Fragment key={hour}>
              <div className="p-2 pe-4 text-center items-center justify-center flex text-[14px] text-newTableText">
                {convertTimeFormatBasedOnLocality(hour)}
              </div>
              {localizedDays.map((day, indexDay) => (
                <Fragment
                  key={`${startDate}-${day.date.format('YYYY-MM-DD')}-${hour}`}
                >
                  <div className="relative">
                    <CalendarColumn
                      getDate={day.date.hour(hour).startOf('hour')}
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
  const { startDate } = useCalendar();
  const t = useT();

  // Use dayjs to get localized day names
  const localizedDays = useMemo(() => {
    const currentLanguage = i18next.resolvedLanguage || 'en';
    dayjs.locale(currentLanguage);

    const days = [];
    // Starting from Monday (1) to Sunday (7)
    for (let i = 1; i <= 7; i++) {
      days.push(dayjs().day(i).format('dddd'));
    }
    return days;
  }, [i18next.resolvedLanguage]);

  const calendarDays = useMemo(() => {
    const monthStart = dayjs(startDate);
    const currentMonth = monthStart.month();
    const currentYear = monthStart.year();

    const startOfMonth = dayjs(new Date(currentYear, currentMonth, 1));

    // Calculate the day offset for Monday (isoWeekday() returns 1 for Monday)
    const startDayOfWeek = startOfMonth.isoWeekday(); // 1 for Monday, 7 for Sunday
    const daysBeforeMonth = startDayOfWeek - 1; // Days to show from the previous month

    // Get the start date (Monday of the first week that includes this month)
    const calendarStartDate = startOfMonth.subtract(daysBeforeMonth, 'day');

    // Create an array to hold the calendar days (6 weeks * 7 days = 42 days max)
    const calendarDays = [];
    let currentDay = calendarStartDate;
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
  }, [startDate]);

  return (
    <div className="flex flex-col text-textColor flex-1">
      <div className="flex-1 flex">
        <div className="grid grid-cols-7 grid-rows-[62px_auto] gap-[4px] rounded-[10px] flex-1">
          {localizedDays.map((day) => (
            <div
              key={day}
              className="z-10 p-2 bg-newTableHeader flex justify-center items-center flex-col h-[62px] rounded-[8px]"
            >
              <div>{day}</div>
            </div>
          ))}
          {calendarDays.map((date, index) => (
            <div
              key={index}
              className="text-center items-center justify-center flex min-h-[100px]"
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
  const t = useT();

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
    sets,
    signature,
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

  const isBeforeNow = useMemo(() => {
    const originalUtc = getDate.startOf('hour');
    return originalUtc.startOf('hour').isBefore(dayjs().startOf('hour').utc());
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
      if (!item.interval) {
        changeDate(item.id, getDate);
      }
      const { status } = await fetch(`/posts/${item.id}/date`, {
        method: 'PUT',
        body: JSON.stringify({
          date: getDate.utc().format('YYYY-MM-DDTHH:mm:ss'),
        }),
      });
      if (status !== 500) {
        if (item.interval) {
          reloadCalendarView();
          return;
        }
        return;
      }
    },
    collect: (monitor) => ({
      canDrop: isBeforeNow ? false : !!monitor.canDrop() && !!monitor.isOver(),
    }),
  }));

  const editPost = useCallback(
    (
        loadPost: Post & {
          integration: Integration;
        },
        isDuplicate?: boolean
      ) =>
      async () => {
        const post = {
          ...loadPost,
          // @ts-ignore
          publishDate: loadPost.actualDate || loadPost.publishDate,
        };

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
            modal: 'w-[100%] max-w-[1400px] text-textColor',
          },
          children: (
            <ExistingData value={data}>
              <AddEditModal
                {...(isDuplicate
                  ? {
                      onlyValues: data.posts.map(
                        ({ image, settings, content }: any) => {
                          return {
                            image,
                            settings,
                            content,
                          };
                        }
                      ),
                    }
                  : {})}
                allIntegrations={integrations.map((p) => ({
                  ...p,
                }))}
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

  const addModal = useCallback(async () => {
    const set: any = !sets.length
      ? undefined
      : await new Promise((resolve) => {
          modal.openModal({
            title: '',
            closeOnClickOutside: true,
            closeOnEscape: true,
            withCloseButton: false,
            onClose: () => resolve('exit'),
            classNames: {
              modal: 'text-textColor',
            },
            children: (
              <ModalWrapperComponent title={t('select_set', 'Select a Set')}>
                <SetSelectionModal
                  sets={sets}
                  onSelect={(selectedSet) => {
                    resolve(selectedSet);
                    modal.closeAll();
                  }}
                  onContinueWithoutSet={() => {
                    resolve(undefined);
                    modal.closeAll();
                  }}
                />
              </ModalWrapperComponent>
            ),
          });
        });

    if (set === 'exit') return;

    modal.openModal({
      closeOnClickOutside: false,
      closeOnEscape: false,
      withCloseButton: false,
      classNames: {
        modal: 'w-[100%] max-w-[1400px] text-textColor',
      },
      children: (
        <AddEditModal
          allIntegrations={integrations.map((p) => ({
            ...p,
          }))}
          integrations={integrations.slice(0).map((p) => ({
            ...p,
          }))}
          mutate={reloadCalendarView}
          {...(signature?.id && !set
            ? {
                onlyValues: [
                  {
                    content: '\n' + signature.content,
                  },
                ],
              }
            : {})}
          date={
            randomHour
              ? getDate.hour(Math.floor(Math.random() * 24))
              : getDate.format('YYYY-MM-DDTHH:mm:ss') ===
                dayjs().startOf('hour').format('YYYY-MM-DDTHH:mm:ss')
              ? dayjs().add(10, 'minute')
              : getDate
          }
          {...(set?.content ? { set: JSON.parse(set.content) } : {})}
          reopenModal={() => ({})}
        />
      ),
      size: '80%',
    });
  }, [integrations, getDate, sets, signature]);
  const openStatistics = useCallback(
    (id: string) => () => {
      modal.openModal({
        closeOnClickOutside: true,
        closeOnEscape: true,
        withCloseButton: false,
        classNames: {
          modal: 'w-[100%] max-w-[1400px]',
        },
        children: (
          <ModalWrapperComponent title={t('statistics', 'Statistics')}>
            <StatisticsModal postId={id} />
          </ModalWrapperComponent>
        ),
        size: '80%',
        // title: `Adding posts for ${getDate.format('DD/MM/YYYY HH:mm')}`,
      });
    },
    []
  );

  const deletePost = useCallback(
    (post: Post) => async () => {
      if (
        !(await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete_post',
            'Are you sure you want to delete post?'
          )
        ))
      ) {
        return;
      }

      await fetch(`/posts/${post.group}`, {
        method: 'DELETE',
      });

      toaster.show(
        t('post_deleted_successfully', 'Post deleted successfully'),
        'success'
      );

      reloadCalendarView();
    },
    [toaster, t]
  );

  const addProvider = useAddProvider();
  return (
    <div
      className={clsx(
        'flex flex-col w-full min-h-full relative',
        isBeforeNow && 'repeated-strip',
        isBeforeNow
          ? 'cursor-not-allowed'
          : 'border border-newTextColor/5 rounded-[8px]'
      )}
      ref={drop as any}
    >
      {display === 'month' && (
        <div className={clsx('pt-[6px] text-[14px]')}>{getDate.date()}</div>
      )}
      <div
        className={clsx(
          'relative flex flex-col flex-1 text-white rounded-[8px] min-h-[70px]',
          canDrop && 'border border-[#612BD3]'
        )}
      >
        <div
          className={clsx(
            'flex-col text-[12px] pointer w-full flex scrollbar scrollbar-thumb-tableBorder scrollbar-track-secondary',
            isBeforeNow ? 'flex-1' : 'cursor-pointer',
            isBeforeNow && postList.length === 0 && 'col-calendar'
          )}
        >
          {list.map((post) => (
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
                  statistics={openStatistics(post.id)}
                  editPost={editPost(post, false)}
                  duplicatePost={editPost(post, true)}
                  post={post}
                  integrations={integrations}
                  deletePost={deletePost(post)}
                />
              </div>
            </div>
          ))}
          {!showAll && postList.length > 3 && (
            <div
              className="text-center hover:underline py-[5px] text-textColor"
              onClick={showAllFunc}
            >
              {t('show_more', '+ Show more')} ({postList.length - 3})
            </div>
          )}
          {showAll && postList.length > 3 && (
            <div
              className="text-center hover:underline py-[5px]"
              onClick={showLessFunc}
            >
              {t('show_less', '- Show less')}
            </div>
          )}
        </div>
        {!isBeforeNow && (
          <div
            className="pb-[2.5px] px-[5px] flex-1 flex"
            onClick={integrations.length ? addModal : addProvider}
          >
            <div
              className={clsx(
                display === ('month' as any)
                  ? 'flex-1 min-h-[40px] w-full'
                  : !postList.length
                  ? 'min-h-full w-full p-[5px]'
                  : 'min-h-[40px] w-full',
                'flex items-center justify-center cursor-pointer pb-[2.5px]'
              )}
            >
              {display !== 'day' && (
                <div
                  className={clsx(
                    'group hover:before:h-[30px] w-full h-full rounded-[10px] flex justify-center items-center text-white'
                  )}
                >
                  <div
                    className={`group-hover:before:content-["+"] pb-[5px] flex justify-center items-center rounded-[8px] transition-all group-hover:bg-btnPrimary w-full h-full max-w-[40px] max-h-[40px]`}
                  />
                </div>
              )}
              {display === 'day' && (
                <div
                  className={`w-full h-full rounded-[10px] py-[10px] flex-wrap hover:border hover:border-seventh flex justify-center items-center gap-[20px] opacity-30 grayscale hover:grayscale-0 hover:opacity-100`}
                >
                  {integrations.map((selectedIntegrations) => (
                    <div
                      className="relative"
                      key={selectedIntegrations.identifier}
                    >
                      <div
                        className={clsx(
                          'relative w-[34px] h-[34px] rounded-[8px] flex justify-center items-center filter transition-all duration-500'
                        )}
                      >
                        <Image
                          src={
                            selectedIntegrations.picture || '/no-picture.jpg'
                          }
                          className="rounded-[8px]"
                          alt={selectedIntegrations.identifier}
                          width={32}
                          height={32}
                        />
                        {selectedIntegrations.identifier === 'youtube' ? (
                          <img
                            src="/icons/platforms/youtube.svg"
                            className="absolute z-10 -bottom-[5px] -end-[5px]"
                            width={20}
                          />
                        ) : (
                          <Image
                            src={`/icons/platforms/${selectedIntegrations.identifier}.png`}
                            className="rounded-[8px] absolute z-10 -bottom-[5px] -end-[5px] border border-fifth"
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
  deletePost: () => void;
  statistics: () => void;
  integrations: Integrations[];
  state: State;
  display: 'day' | 'week' | 'month';
  post: Post & {
    integration: Integration;
    tags: {
      tag: Tags;
    }[];
  };
}> = memo((props) => {
  const t = useT();
  const {
    editPost,
    statistics,
    duplicatePost,
    post,
    date,
    isBeforeNow,
    state,
    display,
    deletePost,
  } = props;
  const { disableXAnalytics } = useVariables();
  const preview = useCallback(() => {
    window.open(`/p/` + post.id + '?share=true', '_blank');
  }, [post]);
  const [{ opacity }, dragRef] = useDrag(
    () => ({
      type: 'post',
      item: {
        id: post.id,
        interval: !!post.intervalInDays,
        date,
      },
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
      style={{
        opacity,
      }}
    >
      <div
        className={clsx(
          'text-white text-[11px] max-h-[24px] h-[24px] min-h-[24px] w-full rounded-tr-[10px] rounded-tl-[10px] flex items-center justify-center gap-[10px] px-[5px] bg-btnPrimary'
        )}
        style={{
          backgroundColor: post?.tags?.[0]?.tag?.color,
        }}
      >
        <div
          className={clsx(
            post?.tags?.[0]?.tag?.color ? 'mix-blend-difference' : '',
            'group-hover:hidden cursor-pointer'
          )}
        >
          {post.tags.map((p) => p.tag.name).join(', ')}
        </div>
        <div
          className={clsx(
            'hidden group-hover:block hover:underline cursor-pointer',
            post?.tags?.[0]?.tag?.color && 'mix-blend-difference'
          )}
          onClick={duplicatePost}
        >
          <Duplicate />
        </div>
        <div
          className={clsx(
            'hidden group-hover:block hover:underline cursor-pointer',
            post?.tags?.[0]?.tag?.color && 'mix-blend-difference'
          )}
          onClick={preview}
        >
          <Preview />
        </div>{' '}
        {post.integration.providerIdentifier === 'x' && disableXAnalytics ? (
          <></>
        ) : (
          <div
            className={clsx(
              'hidden group-hover:block hover:underline cursor-pointer',
              post?.tags?.[0]?.tag?.color && 'mix-blend-difference'
            )}
            onClick={statistics}
          >
            <Statistics />
          </div>
        )}{' '}
        <div
          className={clsx(
            'hidden group-hover:block hover:underline cursor-pointer',
            post?.tags?.[0]?.tag?.color && 'mix-blend-difference'
          )}
          onClick={deletePost}
        >
          <DeletePost />
        </div>
      </div>
      <div
        onClick={editPost}
        className={clsx(
          'gap-[5px] w-full flex h-full flex-1 rounded-br-[10px] rounded-bl-[10px] p-[8px] text-[14px] bg-newColColor',
          'relative',
          isBeforeNow && '!grayscale'
        )}
      >
        <div className={clsx('relative min-w-[20px]')}>
          <img
            className="w-[20px] h-[20px] rounded-[8px]"
            src={post.integration.picture! || '/no-picture.jpg'}
          />
          <img
            className="w-[12px] h-[12px] rounded-[8px] absolute z-10 top-[10px] end-0 border border-fifth"
            src={`/icons/platforms/${post.integration?.providerIdentifier}.png`}
          />
        </div>
        <div className="w-full flex-1 flex flex-col min-h-[40px]">
          <div className="text-start">
            {state === 'DRAFT' ? t('draft', 'Draft') + ': ' : ''}
          </div>
          <div className="w-full relative">
            <div className="absolute top-0 start-0 w-full text-ellipsis break-words line-clamp-1 text-left">
              {stripHtmlValidation('none', post.content, false, true) ||
                'no content'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
const Duplicate = () => {
  const t = useT();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 32 32"
      fill="none"
      data-tooltip-id="tooltip"
      data-tooltip-content={t('duplicate_post', 'Duplicate Post')}
    >
      <path
        d="M27 5H9C8.46957 5 7.96086 5.21071 7.58579 5.58579C7.21071 5.96086 7 6.46957 7 7V9H5C4.46957 9 3.96086 9.21071 3.58579 9.58579C3.21071 9.96086 3 10.4696 3 11V25C3 25.5304 3.21071 26.0391 3.58579 26.4142C3.96086 26.7893 4.46957 27 5 27H23C23.5304 27 24.0391 26.7893 24.4142 26.4142C24.7893 26.0391 25 25.5304 25 25V23H27C27.5304 23 28.0391 22.7893 28.4142 22.4142C28.7893 22.0391 29 21.5304 29 21V7C29 6.46957 28.7893 5.96086 28.4142 5.58579C28.0391 5.21071 27.5304 5 27 5ZM23 11V13H5V11H23ZM23 25H5V15H23V25ZM27 21H25V11C25 10.4696 24.7893 9.96086 24.4142 9.58579C24.0391 9.21071 23.5304 9 23 9H9V7H27V21Z"
        fill="currentColor"
      />
    </svg>
  );
};
const Preview = () => {
  const t = useT();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 32 32"
      fill="none"
      data-tooltip-id="tooltip"
      data-tooltip-content={t('preview_post', 'Preview Post')}
    >
      <path
        d="M30.9137 15.595C30.87 15.4963 29.8112 13.1475 27.4575 10.7937C24.3212 7.6575 20.36 6 16 6C11.64 6 7.67874 7.6575 4.54249 10.7937C2.18874 13.1475 1.12499 15.5 1.08624 15.595C1.02938 15.7229 1 15.8613 1 16.0012C1 16.1412 1.02938 16.2796 1.08624 16.4075C1.12999 16.5062 2.18874 18.8538 4.54249 21.2075C7.67874 24.3425 11.64 26 16 26C20.36 26 24.3212 24.3425 27.4575 21.2075C29.8112 18.8538 30.87 16.5062 30.9137 16.4075C30.9706 16.2796 31 16.1412 31 16.0012C31 15.8613 30.9706 15.7229 30.9137 15.595ZM16 24C12.1525 24 8.79124 22.6012 6.00874 19.8438C4.86704 18.7084 3.89572 17.4137 3.12499 16C3.89551 14.5862 4.86686 13.2915 6.00874 12.1562C8.79124 9.39875 12.1525 8 16 8C19.8475 8 23.2087 9.39875 25.9912 12.1562C27.1352 13.2912 28.1086 14.5859 28.8812 16C27.98 17.6825 24.0537 24 16 24ZM16 10C14.8133 10 13.6533 10.3519 12.6666 11.0112C11.6799 11.6705 10.9108 12.6075 10.4567 13.7039C10.0026 14.8003 9.88377 16.0067 10.1153 17.1705C10.3468 18.3344 10.9182 19.4035 11.7573 20.2426C12.5965 21.0818 13.6656 21.6532 14.8294 21.8847C15.9933 22.1162 17.1997 21.9974 18.2961 21.5433C19.3924 21.0892 20.3295 20.3201 20.9888 19.3334C21.6481 18.3467 22 17.1867 22 16C21.9983 14.4092 21.3657 12.884 20.2408 11.7592C19.1159 10.6343 17.5908 10.0017 16 10ZM16 20C15.2089 20 14.4355 19.7654 13.7777 19.3259C13.1199 18.8864 12.6072 18.2616 12.3045 17.5307C12.0017 16.7998 11.9225 15.9956 12.0768 15.2196C12.2312 14.4437 12.6122 13.731 13.1716 13.1716C13.731 12.6122 14.4437 12.2312 15.2196 12.0769C15.9956 11.9225 16.7998 12.0017 17.5307 12.3045C18.2616 12.6072 18.8863 13.1199 19.3259 13.7777C19.7654 14.4355 20 15.2089 20 16C20 17.0609 19.5786 18.0783 18.8284 18.8284C18.0783 19.5786 17.0609 20 16 20Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Statistics = () => {
  const t = useT();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 32 32"
      fill="none"
      data-tooltip-id="tooltip"
      data-tooltip-content={t('post_statistics', 'Post Statistics')}
    >
      <path
        d="M28 25H27V5C27 4.73478 26.8946 4.48043 26.7071 4.29289C26.5196 4.10536 26.2652 4 26 4H19C18.7348 4 18.4804 4.10536 18.2929 4.29289C18.1054 4.48043 18 4.73478 18 5V10H12C11.7348 10 11.4804 10.1054 11.2929 10.2929C11.1054 10.4804 11 10.7348 11 11V16H6C5.73478 16 5.48043 16.1054 5.29289 16.2929C5.10536 16.4804 5 16.7348 5 17V25H4C3.73478 25 3.48043 25.1054 3.29289 25.2929C3.10536 25.4804 3 25.7348 3 26C3 26.2652 3.10536 26.5196 3.29289 26.7071C3.48043 26.8946 3.73478 27 4 27H28C28.2652 27 28.5196 26.8946 28.7071 26.7071C28.8946 26.5196 29 26.2652 29 26C29 25.7348 28.8946 25.4804 28.7071 25.2929C28.5196 25.1054 28.2652 25 28 25ZM20 6H25V25H20V6ZM13 12H18V25H13V12ZM7 18H11V25H7V18Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const DeletePost = () => {
  const t = useT();
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      data-tooltip-id="tooltip"
      data-tooltip-content={t('delete_post', 'Delete Post')}
    >
      <path
        d="M15 10V18H9V10H15ZM14 4H9.9L8.9 5H6V7H18V5H15L14 4ZM17 8H7V18C7 19.1 7.9 20 9 20H15C16.1 20 17 19.1 17 18V8Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const SetSelectionModal: FC<{
  sets: any[];
  onSelect: (set: any) => void;
  onContinueWithoutSet: () => void;
}> = ({ sets, onSelect, onContinueWithoutSet }) => {
  const t = useT();

  return (
    <div className="flex flex-col gap-4">
      <div className="text-lg font-medium">
        {t('choose_set_or_continue', 'Choose a set or continue without one')}
      </div>

      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
        {sets.map((set) => (
          <div
            key={set.id}
            onClick={() => onSelect(set)}
            className="p-3 border border-tableBorder rounded-lg cursor-pointer hover:transition-colors"
          >
            <div className="font-medium">{set.name}</div>
            {set.description && (
              <div className="text-sm text-gray-400 mt-1">
                {set.description}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2 border-t border-tableBorder">
        <button
          onClick={onContinueWithoutSet}
          className="flex-1 px-4 py-2 text-textColor rounded-lg hover:transition-colors"
        >
          {t('continue_without_set', 'Continue without set')}
        </button>
      </div>
    </div>
  );
};
