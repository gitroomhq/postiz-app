'use client';

import React, {
  FC,
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
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
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
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
import { random } from 'lodash';
import { extend } from 'dayjs';
import {
  use12HourClock,
  useDateFormat,
} from './helpers/date.format';
import { useInterval } from '@mantine/hooks';
import { StatisticsModal } from '@gitroom/frontend/components/launches/statistics';
import { MissingReleaseModal } from '@gitroom/frontend/components/launches/missing-release.modal';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import i18next from 'i18next';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import { CreationMethodBadge } from '@gitroom/frontend/components/launches/creation.method.badge';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import copy from 'copy-to-clipboard';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { Button } from '@gitroom/react/form/button';
import { isClientDemoPost } from '@gitroom/frontend/components/launches/ui-demo-posts';
import { PostQueenLogo } from '@gitroom/frontend/components/ui/logo.component';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';

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
  if (use12HourClock()) {
    return `${time === 12 ? 12 : time % 12}:00 ${time >= 12 ? 'PM' : 'AM'}`;
  } else {
    return `${time}:00`;
  }
};

export const hours = Array.from(
  {
    length: 24,
  },
  (_, i) => i
);

/**
 * Card chrome only: a QUEUE slot whose publish time has passed reads as
 * Published (matches the drag dialog that already treats past QUEUE as
 * "already published"). Does not change API / drag payload state.
 */
function displayPostState(
  state: State,
  publishDate: string | Date
): State {
  if (state === 'QUEUE' && dayjs().isAfter(dayjs.utc(publishDate))) {
    return 'PUBLISHED';
  }
  return state;
}

/**
 * Demo / tour seed posts look real but have no API backing. Match media's
 * read-only toast so actions don't silently no-op and look broken.
 */
export const useDemoPostAction = () => {
  const t = useT();
  const toaster = useToaster();
  const message = t(
    'ui_demo_post_readonly',
    'Sample posts are for layout only. Create a real post to edit, duplicate, preview, or delete.'
  );
  const explain = useCallback(() => {
    toaster.show(message, 'warning');
  }, [toaster, message]);
  return { explain, demoTooltip: message };
};

// Shared hook for post actions (edit, delete, statistics)
/** Shared by calendar cells, list rows, and the Posts queue panel. */
export const usePostActions = (onMutate?: () => void) => {
  const t = useT();
  const fetch = useFetch();
  const modal = useModals();
  const toaster = useToaster();
  const { integrations, reloadCalendarView } = useCalendar();

  const mutate = useCallback(() => {
    reloadCalendarView();
    onMutate?.();
  }, [reloadCalendarView, onMutate]);

  const editPost = useCallback(
    (loadPost: any, isDuplicate?: boolean) => async () => {
      const post = {
        ...loadPost,
        publishDate: loadPost.actualDate || loadPost.publishDate,
      };

      const data = await (await fetch(`/posts/group/${post.group}`)).json();
      const date = !isDuplicate
        ? null
        : (await (await fetch('/posts/find-slot')).json()).date;
      const publishDate = dayjs.utc(date || data.posts[0].publishDate).local();
      const ExistingData = !isDuplicate
        ? ExistingDataContextProvider
        : Fragment;
      modal.openModal({
        id: 'add-edit-modal',
        closeOnClickOutside: false,
        removeLayout: true,
        closeOnEscape: false,
        withCloseButton: false,
        askClose: true,
        fullScreen: true,
        classNames: {
          modal: 'w-[100%] max-w-[1400px] text-textColor',
        },
        children: (
          <ExistingData value={data}>
            <AddEditModal
              {...(isDuplicate
                ? {
                    onlyValues: data.posts.map(
                      ({ image, settings, content }: any) => ({
                        image,
                        settings,
                        content,
                      })
                    ),
                  }
                : {})}
              allIntegrations={integrations.map((p) => ({ ...p }))}
              reopenModal={editPost(post)}
              mutate={mutate}
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
    [integrations, fetch, modal, mutate]
  );

  const copyDebugJson = useCallback(
    (post: any) => () => {
      modal.openModal({
        title: t('copy_debug_json', 'Copy Debug JSON'),
        closeOnClickOutside: true,
        closeOnEscape: true,
        withCloseButton: true,
        classNames: {
          modal: 'w-[100%] max-w-[500px]',
        },
        children: <DebugJsonModal post={post} />,
      });
    },
    [modal, t]
  );

  const deletePost = useCallback(
    (post: any) => async () => {
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

      mutate();
    },
    [toaster, t, fetch, mutate]
  );

  const openStatistics = useCallback(
    (id: string) => () => {
      modal.openModal({
        title: t('statistics', 'Statistics'),
        closeOnClickOutside: true,
        closeOnEscape: true,
        withCloseButton: true,
        classNames: {
          modal: 'w-[100%] max-w-[1400px]',
        },
        children: <StatisticsModal postId={id} />,
        size: '80%',
      });
    },
    [modal, t]
  );

  const openMissingRelease = useCallback(
    (id: string) => () => {
      modal.openModal({
        title: t('connect_post', 'Connect Post'),
        closeOnClickOutside: true,
        closeOnEscape: true,
        withCloseButton: true,
        classNames: {
          modal: 'w-[100%] max-w-[800px]',
        },
        children: <MissingReleaseModal postId={id} onSuccess={mutate} />,
        size: '60%',
      });
    },
    [modal, t, mutate]
  );

  return {
    editPost,
    deletePost,
    copyDebugJson,
    openStatistics,
    openMissingRelease,
  };
};

/**
 * Opens week/day grids at 07:00 instead of midnight.
 *
 * Day rows are variable height — prefer `[data-cal-hour]="7"` (same as
 * scroll-to-now). Week falls back to equal-row math when markers are absent.
 */
const openAtMorning = (el: HTMLDivElement | null) => {
  if (!el || el.dataset.scrolled === '1') return;
  const apply = () => {
    if (el.scrollHeight <= el.clientHeight) return false;
    const target = el.querySelector(
      '[data-cal-hour="7"]'
    ) as HTMLElement | null;
    if (target) {
      const sticky = el.querySelector(
        '[data-cal-sticky-head]'
      ) as HTMLElement | null;
      const top =
        target.offsetTop - (sticky ? sticky.getBoundingClientRect().height : 0);
      el.scrollTop = Math.max(0, top);
    } else {
      el.scrollTop = (el.scrollHeight / 24) * 7;
    }
    el.dataset.scrolled = '1';
    return true;
  };
  if (!apply()) {
    let tries = 0;
    const tick = () => {
      if (apply() || tries++ > 40) return;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
};

/**
 * Jump a Day/Week scroller to a local hour. Prefers `[data-cal-hour]` markers
 * (Day rows are variable height). Falls back to equal-row math for Week.
 * Ignores `dataset.scrolled` so Today can re-center after the morning open.
 */
const scrollScrollerToHour = (el: HTMLElement | null, hour: number) => {
  if (!el) return;
  const clamped = Math.max(0, Math.min(23, hour));
  const apply = () => {
    if (el.scrollHeight <= el.clientHeight) return false;
    const target = el.querySelector(
      `[data-cal-hour="${clamped}"]`
    ) as HTMLElement | null;
    if (target) {
      const sticky = el.querySelector(
        '[data-cal-sticky-head]'
      ) as HTMLElement | null;
      const stickyH = sticky?.offsetHeight ?? 0;
      const elRect = el.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      el.scrollTop += targetRect.top - elRect.top - stickyH;
      el.dataset.scrolled = '1';
      return true;
    }
    el.scrollTop = (el.scrollHeight / 24) * clamped;
    el.dataset.scrolled = '1';
    return true;
  };
  if (!apply()) {
    let tries = 0;
    const tick = () => {
      if (apply() || tries++ > 40) return;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
};

export const DayView = () => {
  const { startDate, scrollToNowToken } = useCalendar();
  const currentDay = newDayjs(startDate).startOf('day');
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const setScrollerRef = useCallback((el: HTMLDivElement | null) => {
    scrollerRef.current = el;
    openAtMorning(el);
  }, []);

  useEffect(() => {
    if (!scrollToNowToken) return;
    scrollScrollerToHour(scrollerRef.current, newDayjs().hour());
  }, [scrollToNowToken]);

  // Owner: Day matches Posts list LOOK (860 column, list cards, hour headers).
  return (
    <div className="relative flex flex-1 flex-col text-pqText">
      <div className="relative flex-1">
        <div
          data-tour="cal-day"
          ref={setScrollerRef}
          className="absolute inset-0 overflow-auto bg-pqInner scrollbar scrollbar-thumb-pqBorder scrollbar-track-pqInner [scrollbar-gutter:stable]"
        >
          <div className="mx-auto flex w-full max-w-[860px] flex-col px-[4px] pb-[40px] pt-[4px]">
            {hours.map((hour) => (
              <DayHourSection
                key={hour}
                hour={hour}
                day={currentDay}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const WeekView = () => {
  const { startDate, openPostsForDay, scrollToNowToken } = useCalendar();
  const t = useT();
  const { mobile } = useViewport();
  // Subscribe so hour labels re-render when Date Metrics (12h/24h) changes.
  useDateFormat();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [swipeHint, setSwipeHint] = useState(false);
  const setScrollerRef = useCallback((el: HTMLDivElement | null) => {
    scrollerRef.current = el;
    openAtMorning(el);
  }, []);

  useEffect(() => {
    if (!scrollToNowToken) return;
    scrollScrollerToHour(scrollerRef.current, newDayjs().hour());
  }, [scrollToNowToken]);

  // Phone week is wider than the viewport — bring today into view and surface
  // a one-time swipe hint so sideways scroll is discoverable (no Day invent).
  useEffect(() => {
    if (!mobile) {
      setSwipeHint(false);
      return;
    }
    const el = scrollerRef.current;
    const todayCol = el?.querySelector<HTMLElement>('[data-cal-today="1"]');
    todayCol?.scrollIntoView({ inline: 'center', block: 'nearest' });
    try {
      if (localStorage.getItem('pq-cal-swipe-hint') === '1') return;
    } catch {
      /* private mode */
    }
    setSwipeHint(true);
  }, [mobile, startDate]);

  const dismissSwipeHint = useCallback(() => {
    setSwipeHint(false);
    try {
      localStorage.setItem('pq-cal-swipe-hint', '1');
    } catch {
      /* private mode */
    }
  }, []);

  // Use dayjs to get localized day names
  const localizedDays = useMemo(() => {
    const currentLanguage = i18next.resolvedLanguage || 'en';
    dayjs.locale(currentLanguage);

    const days = [];
    const weekStart = newDayjs(startDate);
    for (let i = 0; i < 7; i++) {
      const day = weekStart.add(i, 'day');
      days.push({
        name: day.format('dddd'),
        day: day.format('YYYY-MM-DD'),
        date: day,
      });
    }
    return days;
  }, [i18next.resolvedLanguage, startDate]);

  return (
    <div className="relative flex flex-1 flex-col text-pqText">
      <div className="relative flex-1">
        {/* A floor on the day columns rather than `minmax(0, 1fr)` is what stops
            them collapsing into each other at phone widths — below seven
            readable columns the grid scrolls sideways instead of overlapping its
            own headers, which is what it used to do.
            The floor is 84px, not the design's 132px: the design's calendar has
            no channel column beside it, and at 1440 with ours open seven 132px
            columns no longer fit, so the week silently lost a day off the right
            edge. 84px still fits a card and only bites below ~650px.
            The hour column is 72px, not 62px, because a 12-hour locale writes
            "12:00 AM" there and 62px wrapped it onto two lines. */}
        <div
          data-tour="cal-grid"
          ref={setScrollerRef}
          className={clsx(
            'absolute inset-0 grid content-start bg-pqInner [grid-template-columns:72px_repeat(7,_minmax(84px,_1fr))] scrollbar scrollbar-thumb-pqBorder scrollbar-track-pqInner',
            mobile ? 'overflow-x-scroll overflow-y-auto' : 'overflow-auto'
          )}
        >
          {/* Opaque bg + z above grid hatch: past cells scroll under this row;
              brandFaint/hover are alpha tokens and must layer as images, not
              replace background-color, or the hatch shows through the labels. */}
          <div
            data-cal-sticky-head="1"
            className="sticky top-0 z-[30] h-[54px] border-b border-pqBorder bg-pqInner"
          />
          {localizedDays.map((day) => {
            const today = day.date.isSame(newDayjs(), 'day');
            const past = day.date.endOf('day').isBefore(newDayjs());
            return (
              <button
                type="button"
                key={day.day}
                data-cal-today={today ? '1' : undefined}
                onClick={() => openPostsForDay(day.date.startOf('day'))}
                title={t('see_all_posts_on', 'See all posts on {{day}}').replace(
                  '{{day}}',
                  day.date.format('dddd')
                )}
                className={clsx(
                  'sticky top-0 z-[30] flex h-[54px] min-w-0 flex-col items-center justify-center gap-[2px] overflow-hidden border-b border-pqBorder bg-pqInner px-[6px]',
                  today
                    ? '[background-image:linear-gradient(var(--brandFaint),var(--brandFaint))] hover:[background-image:linear-gradient(var(--hover),var(--hover)),linear-gradient(var(--brandFaint),var(--brandFaint))]'
                    : 'hover:[background-image:linear-gradient(var(--hover),var(--hover))]'
                )}
              >
                <div className="flex items-baseline gap-[4px]">
                  <span
                    className={clsx(
                      'text-[12.5px] font-[600] tracking-[0.01em]',
                      today
                        ? 'text-pqFocused'
                        : past
                        ? 'text-pqSoft'
                        : 'text-pqMuted'
                    )}
                  >
                    {day.date.format('ddd')}
                  </span>
                  {(day.date.date() === 1 ||
                    day.date.isSame(newDayjs(startDate), 'day')) && (
                    <span className="rounded-[4px] bg-pqBrandSoft px-[5px] py-[1px] text-[11px] font-[700] uppercase tracking-[0.04em] text-pqBrand">
                      {day.date.format('MMM')}
                    </span>
                  )}
                </div>
                <div
                  className={clsx(
                    'flex h-[27px] min-w-[27px] items-center justify-center rounded-full px-[7px] text-[15px] font-[600]',
                    today
                      ? 'bg-pqBrand text-pqOnBrand shadow-pqToday'
                      : past
                      ? 'text-pqSoft'
                      : 'text-pqText'
                  )}
                >
                  {day.date.date()}
                </div>
              </button>
            );
          })}
          {hours.map((hour) => (
            <Fragment key={hour}>
              {/* `dir="ltr"`: a clock reading is a left-to-right token even in
                  an RTL layout. Without it bidi reorders "0:00 AM" to "AM 0:00". */}
              <div
                data-cal-hour={hour}
                dir="ltr"
                className="flex min-h-[108px] -translate-y-[6px] items-start justify-end whitespace-nowrap border-e border-pqBorder px-[8px] pt-[11px] text-[11.5px] font-[500] text-pqMuted rtl:justify-start"
              >
                {convertTimeFormatBasedOnLocality(hour)}
              </div>
              {localizedDays.map((day) => (
                <CalendarColumn
                  key={`${startDate}-${day.date.format('YYYY-MM-DD')}-${hour}`}
                  getDate={day.date.hour(hour).startOf('hour')}
                />
              ))}
            </Fragment>
          ))}
        </div>
        {mobile && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 end-0 z-[20] w-[28px] bg-gradient-to-l from-pqInner to-transparent"
          />
        )}
        {swipeHint && mobile && (
          <button
            type="button"
            onClick={dismissSwipeHint}
            data-pq="cal-swipe-hint"
            className="absolute bottom-[16px] start-1/2 z-[40] -translate-x-1/2 rounded-full bg-pqPop px-[14px] py-[8px] text-[12.5px] font-[600] text-pqText shadow-pqE2"
          >
            {t('cal_swipe_for_days', 'Swipe sideways for more days')}
          </button>
        )}
      </div>
    </div>
  );
};
export const MonthView = () => {
  const { startDate } = useCalendar();

  // Use dayjs to get localized day names
  const localizedDays = useMemo(() => {
    const currentLanguage = i18next.resolvedLanguage || 'en';
    dayjs.locale(currentLanguage);

    const days = [];
    // Starting from Monday (1) to Sunday (7)
    for (let i = 1; i <= 7; i++) {
      days.push(newDayjs().day(i).format('dddd'));
    }
    return days;
  }, [i18next.resolvedLanguage]);

  const calendarDays = useMemo(() => {
    const monthStart = newDayjs(startDate);
    const currentMonth = monthStart.month();
    const currentYear = monthStart.year();

    const startOfMonth = newDayjs(new Date(currentYear, currentMonth, 1));

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
    <div className="flex flex-1 flex-col text-pqText">
      <div className="relative flex flex-1">
        {/* Same hairline language as the week grid: no gaps, no rounded tiles —
            the cells draw the lines with their own borders. */}
        <div className="absolute start-0 top-0 grid h-full w-full content-start overflow-auto bg-pqInner [grid-template-columns:repeat(7,_minmax(84px,_1fr))] scrollbar scrollbar-thumb-pqBorder scrollbar-track-pqInner">
          {localizedDays.map((day) => (
            <div
              key={day}
              className="sticky top-0 z-[30] flex h-[54px] min-w-0 items-center justify-center overflow-hidden border-b border-s border-pqBorder bg-pqInner px-[6px] text-[12.5px] font-[600] tracking-[0.01em] text-pqMuted"
            >
              <span className="truncate">{day}</span>
            </div>
          ))}
          {calendarDays.map((date, index) => (
            <CalendarColumn
              key={index}
              getDate={newDayjs(date.day).endOf('day')}
              randomHour={true}
              outOfMonth={date.label !== 'current-month'}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
export const ListView = () => {
  const t = useT();
  const user = useUser();
  const fetch = useFetch();
  const modal = useModals();
  const { longDatePattern } = useDateFormat();
  const {
    loading,
    listPosts,
    listState,
    listPage,
    listTotal,
    listTotalPages,
    setListPage,
    listSort,
    listRange,
    setListRange,
    integrations,
    reloadCalendarView,
    sets,
  } = useCalendar();
  const emptyMessage =
    listState === 'scheduled'
      ? t('no_upcoming_posts', 'No upcoming posts scheduled')
      : listState === 'draft'
      ? t('no_draft_posts', 'No draft posts')
      : listState === 'published'
      ? t('no_published_posts', 'No published posts')
      : t('no_posts', 'No posts');
  const emptySubtitle =
    listState === 'scheduled'
      ? t(
          'list_empty_scheduled_hint',
          'Nothing matches this filter. Try All dates or create a post.'
        )
      : listState === 'draft'
      ? t(
          'list_empty_draft_hint',
          'Save a draft from Create Post, or move a scheduled post to drafts.'
        )
      : listState === 'published'
      ? t(
          'list_empty_published_hint',
          'Published posts will show up here once they go live.'
        )
      : t(
          'list_empty_all_hint',
          'No posts yet. Create one to get started.'
        );

  // Same blank-compose path as header Create Post (NewPost.createAPost).
  const createPost = useCallback(async () => {
    const date = (await (await fetch('/posts/find-slot')).json()).date;

    const set: any = !sets.length
      ? undefined
      : await new Promise((resolve) => {
          modal.openModal({
            title: t('select_set', 'Select a Set'),
            closeOnClickOutside: true,
            closeOnEscape: true,
            withCloseButton: false,
            onClose: () => resolve('exit'),
            classNames: {
              modal: 'text-textColor',
            },
            children: (
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
            ),
          });
        });

    if (set === 'exit') return;

    modal.openModal({
      id: 'add-edit-modal',
      closeOnClickOutside: false,
      removeLayout: true,
      closeOnEscape: false,
      withCloseButton: false,
      askClose: true,
      fullScreen: true,
      classNames: {
        modal: 'w-[100%] max-w-[1400px] text-textColor',
      },
      children: (
        <AddEditModal
          allIntegrations={integrations.map((p) => ({
            ...p,
          }))}
          {...(set?.content ? { set: JSON.parse(set.content) } : {})}
          reopenModal={createPost}
          mutate={reloadCalendarView}
          integrations={integrations}
          date={dayjs.utc(date).local()}
        />
      ),
      size: '80%',
      title: ``,
    });
  }, [fetch, integrations, modal, reloadCalendarView, sets, t]);

  // Use shared post actions hook
  const {
    editPost,
    deletePost,
    copyDebugJson,
    openStatistics,
    openMissingRelease,
  } = usePostActions();

  // Group posts by date; day headers follow listSort (Newest → later days first).
  const groupedPosts = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    listPosts.forEach((post) => {
      const dateKey = newDayjs(post.publishDate).local().format('YYYY-MM-DD');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(post);
    });
    return Object.entries(groups).sort(([a], [b]) =>
      listSort === 'desc' ? b.localeCompare(a) : a.localeCompare(b)
    );
  }, [listPosts, listSort]);

  const showMore = useCallback(
    () => setListPage(listPage + 1),
    [listPage, setListPage]
  );
  const collapsePosts = useCallback(() => setListPage(0), [setListPage]);
  const hasMore = listPage < listTotalPages - 1;
  // Single interpolated key so RTL / non-English locales can reorder freely.
  const shownLabel = t('showing_x_of_y', '{{shown}} of {{total}}')
    .replace('{{shown}}', String(listPosts.length))
    .replace('{{total}}', String(listTotal));

  if (loading && !listPosts.length) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center">
        <div className="text-textColor">{t('loading', 'Loading...')}</div>
      </div>
    );
  }

  if (listPosts.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-[20px] px-[26px] py-[80px] text-center">
        <span className="grid size-[76px] place-items-center rounded-full bg-pqBrandFaint">
          <PostQueenLogo
            tileClassName="size-[52px]"
            glyphClassName="size-[28px]"
          />
        </span>
        <div className="max-w-[360px]">
          <div className="text-[15px] font-[600] text-pqText">{emptyMessage}</div>
          <div className="mt-[8px] text-[13px] leading-[1.6] text-pqMuted">
            {emptySubtitle}
          </div>
        </div>
        <div className="flex flex-col items-center gap-[16px]">
          <button
            type="button"
            onClick={createPost}
            className="h-[34px] min-w-[180px] rounded-pqSm bg-pqBrand px-[18px] text-[13px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover"
          >
            {t('create_new_post', 'Create Post')}
          </button>
          {listRange !== 'all' && (
            <button
              type="button"
              onClick={() => setListRange('all')}
              className="text-[12.5px] font-[500] text-pqSoft underline-offset-[3px] transition-colors hover:text-pqMuted hover:underline"
            >
              {t('show_all_dates', 'Show all dates')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="absolute inset-0 overflow-auto scrollbar scrollbar-thumb-pqBorder scrollbar-track-pqInner [scrollbar-gutter:stable]">
        <div className="mx-auto flex w-full max-w-[860px] flex-col px-[4px] pb-[40px] pt-[4px]">
          {groupedPosts.map(([dateKey, datePosts]) => (
            <Fragment key={dateKey}>
              <div className="flex items-center gap-[10px] pb-[9px] pt-[18px]">
                <span className="shrink-0 text-[11.5px] font-[600] uppercase tracking-[0.05em] text-pqSoft">
                  {newDayjs(dateKey).format(longDatePattern())}
                </span>
                <span className="h-[1px] flex-1 bg-pqLine" aria-hidden="true" />
                <span className="shrink-0 text-[11.5px] text-pqSoft">
                  {datePosts.length}{' '}
                  {datePosts.length === 1 ? t('post', 'Post') : t('posts', 'Posts')}
                </span>
              </div>
              <div className="flex flex-col gap-[6px]">
                {datePosts.map((post) => (
                  <ListItem
                    key={post.id}
                    post={post}
                    statistics={openStatistics(post.id)}
                    missingRelease={openMissingRelease(post.id)}
                    editPost={editPost(post, false)}
                    duplicatePost={editPost(post, true)}
                    copyDebugJson={
                      user?.isSuperAdmin ? copyDebugJson(post) : undefined
                    }
                    deletePost={deletePost(post)}
                  />
                ))}
              </div>
            </Fragment>
          ))}
          {hasMore ? (
            <div className="flex flex-col items-center gap-[8px] pb-[8px] pt-[22px]">
              <button
                type="button"
                onClick={showMore}
                className="flex h-[36px] items-center gap-[8px] rounded-pqSm bg-pqInner px-[18px] text-[13px] font-[600] text-pqText shadow-[inset_0_0_0_1px_var(--border)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--brand)]"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                  <path
                    d="m6 9 6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t('show_more_posts', 'Show more')}
              </button>
              <span className="text-[12px] text-pqSoft">{shownLabel}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-[10px] pb-[8px] pt-[22px]">
              <span className="text-[12px] text-pqSoft">{shownLabel}</span>
              {listPage > 0 && (
                <button
                  type="button"
                  onClick={collapsePosts}
                  className="flex h-[30px] items-center gap-[7px] rounded-pqSm px-[13px] text-[12.5px] font-[500] text-pqMuted shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-pqHover hover:text-pqText"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    className="rotate-180"
                  >
                    <path
                      d="m6 9 6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t('collapse', 'Collapse')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const Calendar = () => {
  const { display } = useCalendar();
  return (
    <>
      {display === 'list' ? (
        <ListView />
      ) : display === 'day' ? (
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
  /** Month grid: days outside the focused month (prototype soft numColor). */
  outOfMonth?: boolean;
}> = memo((props) => {
  const t = useT();
  const { formatShortWeekdayTime } = useDateFormat();

  const { getDate, randomHour, outOfMonth } = props;
  const [num, setNum] = useState(0);
  const user = useUser();
  const {
    integrations,
    posts,
    changeDate,
    display,
    reloadCalendarView,
    sets,
    signature,
    loading,
    openPostsForDay,
  } = useCalendar();
  const modal = useModals();
  const fetch = useFetch();
  const toaster = useToaster();

  // Use shared post actions hook
  const {
    editPost,
    deletePost,
    copyDebugJson,
    openStatistics,
    openMissingRelease,
  } = usePostActions();
  const postList = useMemo(() => {
    return posts.filter((post) => {
      const pList = dayjs.utc(post.publishDate).local();
      // Day and week both bucket by hour — day used to match exact minute so it
      // could sit on autopost publish times; the design day grid is hourly.
      const check =
        display === 'day' || display === 'week'
          ? pList.isSameOrAfter(getDate.startOf('hour')) &&
            pList.isBefore(getDate.endOf('hour'))
          : pList.isSame(getDate, 'day');
      return check;
    });
  }, [posts, display, getDate]);
  const showAllFunc = useCallback(() => {
    // Design: overflow opens the Posts list for that day — not in-cell expand.
    openPostsForDay(getDate.startOf('day'));
  }, [openPostsForDay, getDate]);
  // Prototype week: >2 groups → show 1 card + See all N. Month: up to 3 + +N more.
  // Painting three full cards in a 108px week cell was clipping content and actions.
  const list = useMemo(() => {
    if (display === 'week' && postList.length > 2) {
      return postList.slice(0, 1);
    }
    if (display === 'month') {
      return postList.slice(0, 3);
    }
    return postList;
  }, [postList, display]);
  const showOverflowChip =
    display === 'week'
      ? postList.length > 2
      : display === 'month'
      ? postList.length > 3
      : false;
  const cellClampTwo = display === 'week' && postList.length === 2;

  const isBeforeNow = useMemo(() => {
    const originalUtc = getDate.startOf('hour');
    return originalUtc
      .startOf('hour')
      .isBefore(newDayjs().startOf('hour').utc());
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
  const [{ canDrop, isTarget }, drop] = useDrop(
    () => ({
      accept: 'post',
      drop: async (item: any) => {
        if (isBeforeNow) return;

        // Month cells arrive as endOf('day'); schedule at noon instead of 23:59.
        const dropAt =
          display === 'month'
            ? getDate.startOf('day').hour(12).minute(0).second(0)
            : getDate;

        // Find the post to check its state
        const post = posts.find((p) => p.id === item.id);
        let action: 'schedule' | 'update' = 'schedule';

        // Check if post is already published or queued in the past
        if (
          post &&
          (post.state === 'PUBLISHED' ||
            (post.state === 'QUEUE' &&
              dayjs().isAfter(dayjs.utc(post.publishDate))))
        ) {
          const whatToDo = await new Promise<'schedule' | 'update' | 'cancel'>(
            (resolve) => {
              modal.openModal({
                title: t('what_do_you_want_to_do', 'What do you want to do?'),
                children: (
                  <div className="flex flex-col">
                    <div className="text-[20px] mb-[20px]">
                      {t(
                        'post_already_published_drag',
                        'This post was already published, what do you want to do?'
                      )}
                    </div>
                    <div className="flex w-full gap-[10px]">
                      <div className="flex-1 flex">
                        <Button
                          type="button"
                          className="flex-1"
                          onClick={() => {
                            modal.closeAll();
                            resolve('update');
                          }}
                        >
                          {t(
                            'just_update_post_details',
                            'Just update the post details'
                          )}
                        </Button>
                      </div>
                      <div className="flex-1 flex">
                        <Button
                          type="button"
                          className="flex-1"
                          onClick={() => {
                            modal.closeAll();
                            resolve('schedule');
                          }}
                        >
                          {t('reschedule_post', 'Reschedule the post')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ),
                onClose: () => resolve('cancel'),
              });
            }
          );

          if (whatToDo === 'cancel') {
            return;
          }
          action = whatToDo;
        }

        if (!item.interval) {
          changeDate(item.id, dropAt);
        }
        const { status } = await fetch(`/posts/${item.id}/date`, {
          method: 'PUT',
          body: JSON.stringify({
            date: dropAt.utc().format('YYYY-MM-DDTHH:mm:ss'),
            action,
          }),
        });
        if (status >= 200 && status < 300) {
          if (action === 'schedule') {
            toaster.show(
              t('scheduled_for_when', 'Scheduled for {when}').replace(
                '{when}',
                formatShortWeekdayTime(dropAt)
              ),
              'success'
            );
          }
          if (item.interval || action === 'schedule') {
            reloadCalendarView();
            return;
          }
          return;
        }
      },
      collect: (monitor) => ({
        canDrop: isBeforeNow
          ? false
          : !!monitor.canDrop() && !!monitor.isOver(),
        // Every legal landing place, not just the one under the cursor: the
        // design marks them all faintly so you can see where a post may go
        // before you get there.
        isTarget: isBeforeNow
          ? false
          : !!monitor.canDrop() && !monitor.isOver(),
      }),
    }),
    [
      posts,
      changeDate,
      fetch,
      getDate,
      display,
      modal,
      reloadCalendarView,
      t,
      toaster,
      isBeforeNow,
    ]
  );

  const addModal = useCallback(async () => {
    const set: any = !sets.length
      ? undefined
      : await new Promise((resolve) => {
          modal.openModal({
            title: t('select_set', 'Select a Set'),
            closeOnClickOutside: true,
            askClose: false,
            closeOnEscape: true,
            withCloseButton: true,
            onClose: () => resolve('exit'),
            children: (
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
            ),
          });
        });

    if (set === 'exit') return;

    modal.openModal({
      id: 'add-edit-modal',
      closeOnClickOutside: false,
      removeLayout: true,
      closeOnEscape: false,
      withCloseButton: false,
      askClose: true,
      fullScreen: true,
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
                newDayjs().startOf('hour').format('YYYY-MM-DDTHH:mm:ss')
              ? newDayjs().add(10, 'minute')
              : getDate
          }
          {...(set?.content ? { set: JSON.parse(set.content) } : {})}
          reopenModal={() => ({})}
        />
      ),
      size: '80%',
    });
  }, [integrations, getDate, sets, signature]);

  const addProvider = useAddProvider();
  const isToday = getDate.isSame(newDayjs(), 'day');
  const isDay = display === 'day';
  const emptySlotLabel = isBeforeNow
    ? t('date_passed', 'Date passed')
    : t('add_a_post_at', 'Add a post at {{time}}').replace(
        '{{time}}',
        convertTimeFormatBasedOnLocality(getDate.hour())
      );

  return (
    // Week/month: cell draws its own hairlines. Day: the parent row owns the
    // top/gutter hairlines (`dayRows` template) — no extra borders here, or they
    // read as the white lines on the old autopost bands.
    <div
      ref={drop as any}
      data-cell="1"
      data-dayslot={isDay ? '1' : undefined}
      data-filled={postList.length ? '1' : '0'}
      data-past={isBeforeNow ? '1' : '0'}
      // Week never stacks: overflow is See all, not hover-scroll (prototype stackAttr:0).
      // Day grows with its posts (prototype min-height 64, no max).
      data-stack={
        display !== 'week' && display !== 'day' && postList.length > 1
          ? '1'
          : '0'
      }
      className={clsx(
        'relative flex min-w-0 flex-col',
        isDay
          ? 'min-h-[64px] gap-[6px] px-[4px] py-[8px] ps-[12px]'
          : 'gap-[3px] border-b border-s border-pqLine p-[3px]',
        !isDay && display === 'month' && 'min-h-[126px]',
        !isDay && display === 'week' && 'min-h-[108px] max-h-[108px]',
        !isDay && isToday && !isBeforeNow && 'bg-pqBrandFaint',
        outOfMonth && 'bg-pqTableHeader',
        isBeforeNow
          ? clsx(!isDay && 'pq-hatch', 'cursor-not-allowed')
          : 'cursor-pointer',
        canDrop && 'shadow-[inset_0_0_0_2px_var(--brand)]',
        isTarget && 'shadow-[inset_0_0_0_1px_var(--dropHint)]',
        loading && 'animate-pulse'
      )}
      onClick={
        isDay && !isBeforeNow
          ? integrations.length
            ? addModal
            : addProvider
          : undefined
      }
    >
      {display === 'month' && (
        <div className="flex items-center gap-[5px] px-[2px] pb-[1px] pt-[3px]">
          <span
            className={clsx(
              'grid h-[22px] min-w-[22px] place-items-center rounded-full px-[6px] text-[12.5px] font-[600]',
              isToday && !isBeforeNow
                ? 'bg-pqBrand text-white'
                : outOfMonth
                ? 'text-pqSoft'
                : 'text-pqText'
            )}
          >
            {getDate.date()}
          </span>
          {postList.length > 3 && (
            <span className="ms-auto text-[10.5px] font-[700] text-pqSoft">
              {postList.length}
            </span>
          )}
        </div>
      )}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          className={clsx(
            'flex w-full flex-col text-[12px]',
            isDay ? 'gap-[6px]' : 'gap-[3px]',
            isBeforeNow ? 'flex-1' : 'cursor-pointer'
          )}
        >
          {loading && (
            <div className="h-full w-full p-[5px] animate-pulse absolute left-0 top-0 z-[50]">
              <div className="h-full w-full rounded-[10px] bg-pqSettings" />
            </div>
          )}
          {list.map((post) => (
            <CalendarItem
              key={post.id}
              display={display as 'day' | 'week' | 'month'}
              isBeforeNow={isBeforeNow}
              date={getDate}
              state={post.state}
              statistics={openStatistics(post.id)}
              missingRelease={openMissingRelease(post.id)}
              editPost={editPost(post, false)}
              duplicatePost={editPost(post, true)}
              copyDebugJson={
                user?.isSuperAdmin ? copyDebugJson(post) : undefined
              }
              post={post}
              integrations={integrations}
              deletePost={deletePost(post)}
              lineClamp={cellClampTwo ? 1 : 2}
            />
          ))}
          {showOverflowChip && (
            <button
              type="button"
              className="relative z-[4] flex h-[19px] w-full shrink-0 cursor-pointer items-center justify-center gap-[3px] whitespace-nowrap rounded-[5px] bg-pqBrandSoft px-[5px] text-[10.5px] font-[700] text-pqFocused transition-colors hover:bg-pqBrandFaint"
              onClick={(e) => {
                e.stopPropagation();
                showAllFunc();
              }}
            >
              {display === 'month'
                ? t('n_more', '+{{count}} more').replace(
                    '{{count}}',
                    String(postList.length - 3)
                  )
                : t('see_all_n_posts', 'See all {{count}} posts').replace(
                    '{{count}}',
                    String(postList.length)
                  )}
            </button>
          )}
        </div>
        {/* Empty past slots only — never paint "Date passed" across cards / See all. */}
        {!isDay && isBeforeNow && postList.length === 0 && (
          <div
            data-cell-past-label="1"
            className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center text-[14px] text-pqText opacity-0 transition-opacity"
          >
            {t('date_passed', 'Date passed')}
          </div>
        )}
        {/* Day empty slots: always-visible chip (prototype emptyLabel), not the
            week/month hover "+" and not the old greyscale channel icon row. */}
        {isDay && postList.length === 0 && (
          <div
            className={clsx(
              'mt-auto flex h-[34px] max-w-[230px] items-center gap-[7px] rounded-[8px] px-[11px] text-[12px] text-pqSoft shadow-[inset_0_0_0_1px_var(--border)]',
              !isBeforeNow && 'pointer-events-none'
            )}
          >
            {!isBeforeNow && (
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 5.5v13M5.5 12h13"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
              </svg>
            )}
            {emptySlotLabel}
          </div>
        )}
        {!isDay && !isBeforeNow && (
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
              {/* Shown by the `[data-cell]:hover [data-cell-add]` rule in
                  global.scss rather than by React, so moving the pointer
                  across the grid does not re-render it. */}
              <div
                data-cell-add="1"
                className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-[3px]"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="26"
                  height="26"
                  fill="none"
                  className="text-pqBrand"
                  aria-hidden="true"
                >
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-[11.5px] font-[600] -tracking-[0.01em] text-pqFocused">
                  {convertTimeFormatBasedOnLocality(getDate.hour())}
                </span>
              </div>
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
  copyDebugJson?: () => void;
  deletePost: () => void;
  statistics: () => void;
  missingRelease?: () => void;
  integrations: Integrations[];
  state: State;
  display: 'day' | 'week' | 'month';
  showTime?: boolean;
  /** Week with two cards uses 1-line clamp so both fit the 108px cell. */
  lineClamp?: 1 | 2;
  post: Post & {
    integration: Integration;
    tags: {
      tag: Tags;
    }[];
  };
}> = memo((props) => {
  const t = useT();
  const { timePattern } = useDateFormat();
  const {
    editPost,
    duplicatePost,
    copyDebugJson,
    post,
    date,
    isBeforeNow,
    state: rawState,
    deletePost,
    lineClamp = 2,
  } = props;
  const state = displayPostState(rawState, post.publishDate);
  // Past QUEUE paints as Published, but the API row is still editable QUEUE.
  const canEdit = rawState !== 'PUBLISHED';
  const user = useUser();
  const demo = isClientDemoPost(post.id);
  const { explain: explainDemo, demoTooltip } = useDemoPostAction();
  const showCreationMethodBadge =
    user?.impersonate &&
    post.creationMethod &&
    post.creationMethod !== 'UNKNOWN';
  const preview = useCallback(() => {
    if (demo) {
      explainDemo();
      return;
    }
    window.open(`/p/` + post.id + '?share=true', '_blank');
  }, [post, demo, explainDemo]);
  const onEdit = useCallback(
    (e?: React.MouseEvent) => {
      // Day slots put compose on the cell; card click must not bubble into it.
      e?.stopPropagation();
      if (demo) {
        explainDemo();
        return;
      }
      editPost();
    },
    [demo, editPost, explainDemo]
  );
  const onDuplicate = useCallback(() => {
    if (demo) {
      explainDemo();
      return;
    }
    duplicatePost();
  }, [demo, duplicatePost, explainDemo]);
  const onDelete = useCallback(() => {
    if (demo) {
      explainDemo();
      return;
    }
    deletePost();
  }, [demo, deletePost, explainDemo]);
  const [{ opacity }, dragRef] = useDrag(
    () => ({
      type: 'post',
      item: {
        id: post.id,
        interval: !!post.intervalInDays,
        date,
        state: post.state,
        // Distinguishes calendar→Posts-panel (convert to draft on any tab)
        // from list→Scheduled (put-back / cancel reschedule, leave QUEUE).
        source: 'calendar' as const,
      },
      canDrag: !demo,
      collect: (monitor) => ({
        // 40%, not invisible: the design keeps the card faintly in place so you
        // can still see where it came from. (Doc 02 says "fully transparent" —
        // that describes this repo before the redesign, not the prototype.)
        opacity: monitor.isDragging() ? 0.4 : 1,
      }),
    }),
    [demo, post.id, post.intervalInDays, post.state, date]
  );
  // The accent stripe: tag colour when tagged; else published → ok, draft →
  // soft brand stripe (day view), otherwise brand for scheduled.
  const accent = post?.tags?.[0]?.tag?.color
    ? post.tags[0].tag.color
    : state === 'PUBLISHED'
    ? 'var(--ok)'
    : state === 'DRAFT'
    ? 'var(--soft)'
    : state === 'ERROR'
    ? 'var(--warn)'
    : 'var(--brand)';
  const tagNames = post.tags.map((p) => p.tag.name).join(', ');
  const actionButton =
    'grid h-[18px] w-[20px] place-items-center rounded-[4px] text-pqMuted transition-colors hover:bg-pqHover hover:text-pqText disabled:opacity-40';
  const contentPreview =
    stripHtmlValidation('none', post.content, false, true, false) ||
    t('no_content', 'no content');
  const timeLabel = dayjs
    .utc(post.publishDate)
    .local()
    .format(timePattern());

  // Month view: compact 24px chips (prototype data-mpost), not full week cards.
  if (props.display === 'month') {
    return (
      <div
        // @ts-ignore
        ref={dragRef}
        data-ci="1"
        data-mpost="1"
        onClick={onEdit}
        className={clsx(
          'relative z-[2] flex h-[24px] w-full min-w-0 shrink-0 cursor-pointer items-center gap-[5px] overflow-hidden rounded-[6px] bg-pqPop pe-[6px] ps-[4px] text-start shadow-[inset_0_0_0_1px_var(--border)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--brand)]',
          state === 'ERROR' && 'ring-1 ring-pqDanger',
          state === 'PUBLISHED' &&
            'shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--ok)_35%,var(--border))]'
        )}
        style={{ opacity }}
      >
        <span
          className="h-[14px] w-[3px] shrink-0 rounded-[2px]"
          style={{ background: accent }}
          aria-hidden="true"
        />
        <img
          className="size-[13px] shrink-0 rounded-[4px] object-cover"
          src={`/icons/platforms/${post.integration?.providerIdentifier}.png`}
          alt=""
        />
        <span className="relative size-[13px] shrink-0">
          <img
            className="size-[13px] rounded-full object-cover"
            src={post.integration.picture! || '/no-picture.jpg'}
            alt=""
          />
        </span>
        <span className="shrink-0 text-[10px] font-[700] text-pqMuted">
          {timeLabel}
        </span>
        <span className="min-w-0 flex-1 truncate text-[10.5px] text-pqText">
          {contentPreview}
        </span>
      </div>
    );
  }

  // Day view: list-adjacent card (prototype showDay) — content first, channel
  // row under, max 560px, actions top-end. Wider than week cells.
  if (props.display === 'day') {
    const dayAccent =
      state === 'PUBLISHED'
        ? 'var(--ok)'
        : state === 'DRAFT'
        ? 'var(--soft)'
        : state === 'ERROR'
        ? 'var(--warn)'
        : 'var(--brand)';
    const dayAction =
      'grid h-[22px] w-[24px] place-items-center rounded-[5px] text-pqMuted transition-colors hover:bg-pqHover hover:text-pqText disabled:opacity-40';
    return (
      <div
        // @ts-ignore
        ref={dragRef}
        data-ci="1"
        onClick={onEdit}
        className={clsx(
          'group relative z-[2] flex w-full max-w-[560px] min-w-0 shrink-0 cursor-pointer overflow-hidden rounded-[9px] bg-pqPop text-start shadow-[inset_0_0_0_1px_var(--border),var(--e1)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--brand),var(--e2)]',
          state === 'ERROR' && 'ring-2 ring-pqDanger',
          state === 'PUBLISHED' &&
            'shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--ok)_40%,var(--border)),var(--e1)]'
        )}
        style={{ opacity }}
      >
        <span
          className="w-[3px] shrink-0"
          style={{
            background: dayAccent,
            backgroundImage:
              state === 'DRAFT'
                ? 'repeating-linear-gradient(180deg, var(--soft) 0 3px, transparent 3px 6px)'
                : undefined,
          }}
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-[6px] p-[9px_11px]">
          <div className="break-words text-[13px] leading-[1.45] text-pqText">
            {contentPreview}
          </div>
          <div className="flex items-center gap-[7px]">
            <img
              className="size-[16px] shrink-0 rounded-[4px] object-cover"
              src={`/icons/platforms/${post.integration?.providerIdentifier}.png`}
              alt=""
            />
            <img
              className="size-[16px] shrink-0 rounded-full object-cover"
              src={post.integration.picture! || '/no-picture.jpg'}
              alt=""
            />
            <span className="min-w-0 truncate text-[11.5px] text-pqSoft">
              {post.integration.name}
            </span>
            <span className="min-w-0 flex-1" />
            {/* Status chip: design only shows Draft; owner wants Scheduled too
                (Posts panel colours). Sits before time — actions are top-end. */}
            {state === 'QUEUE' && (
              <span className="flex shrink-0 items-center gap-[4px] text-[9.5px] font-[700] uppercase tracking-[0.04em] text-pqFocused">
                <span
                  className="size-[5px] rounded-full bg-pqFocused"
                  aria-hidden
                />
                {t('scheduled', 'Scheduled')}
              </span>
            )}
            {state === 'DRAFT' && (
              <span className="shrink-0 text-[9.5px] font-[700] uppercase tracking-[0.04em] text-pqSoft">
                {t('draft', 'Draft')}
              </span>
            )}
            {state === 'PUBLISHED' && (
              <span className="flex shrink-0 items-center gap-[4px] text-[9.5px] font-[700] uppercase tracking-[0.04em] text-pqOk">
                <span className="size-[5px] rounded-full bg-pqOk" aria-hidden />
                {t('published', 'Published')}
              </span>
            )}
            {state === 'ERROR' && (
              <span
                className="grid size-[14px] shrink-0 place-items-center rounded-full bg-pqDanger text-[10px] font-bold text-pqOnBrand"
                data-tooltip-id="tooltip"
                data-tooltip-content={
                  post.error || 'An error occurred while publishing this post'
                }
              >
                !
              </span>
            )}
            <span className="shrink-0 text-[11.5px] font-[600] text-pqMuted">
              {timeLabel}
            </span>
          </div>
        </div>
        <div
          data-ci-actions="1"
          onClick={(e) => e.stopPropagation()}
          className="absolute end-[7px] top-[7px] z-[5] flex gap-[1px] rounded-[7px] bg-pqSettings p-[2px] opacity-0 shadow-[inset_0_0_0_1px_var(--border)] transition-opacity focus-within:opacity-100 group-hover:opacity-100"
        >
          {copyDebugJson && !demo && (
            <button
              type="button"
              className={dayAction}
              onClick={copyDebugJson}
            >
              <CopyDebug />
            </button>
          )}
          {canEdit && (
            <button type="button" className={dayAction} onClick={onEdit}>
              <EditPost tooltip={demo ? demoTooltip : undefined} />
            </button>
          )}
          <button type="button" className={dayAction} onClick={onDuplicate}>
            <Duplicate tooltip={demo ? demoTooltip : undefined} />
          </button>
          <button type="button" className={dayAction} onClick={preview}>
            <Preview tooltip={demo ? demoTooltip : undefined} />
          </button>
          <button
            type="button"
            className={clsx(dayAction, 'hover:text-pqWarn')}
            onClick={onDelete}
          >
            <DeletePost tooltip={demo ? demoTooltip : undefined} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      // @ts-ignore
      ref={dragRef}
      data-ci="1"
      onClick={onEdit}
      className={clsx(
        // z-[2]: stay above empty-slot past label / hatch stacking if both ever coexist.
        'group relative z-[2] flex w-full min-w-0 shrink-0 cursor-pointer overflow-hidden rounded-[7px] bg-pqPop text-start shadow-[inset_0_0_0_1px_var(--border)] transition-shadow hover:z-[3] hover:shadow-[inset_0_0_0_1px_var(--brand),var(--e2)]',
        state === 'ERROR' && 'ring-2 ring-red-500',
        state === 'PUBLISHED' &&
          'shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--ok)_40%,var(--border))]'
      )}
      style={{
        opacity,
      }}
    >
      {/* The error marker moved into the card's own top row, next to the
          status dot, because the card no longer overflows its cell. */}
      {showCreationMethodBadge && (
        <div className="absolute bottom-[3px] start-[5px] z-[4]">
          <CreationMethodBadge
            creationMethod={post.creationMethod}
            ringColor="var(--pop)"
          />
        </div>
      )}
      <span
        className="w-[3px] shrink-0"
        style={{ background: accent }}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-[3px] py-[5px] pe-[6px] ps-[7px]">
        <div className="flex min-w-0 items-center gap-[5px]">
          <img
            className="size-[16px] shrink-0 rounded-[4px] object-cover"
            src={`/icons/platforms/${post.integration?.providerIdentifier}.png`}
            alt=""
          />
          <img
            className="size-[16px] shrink-0 rounded-full object-cover"
            src={post.integration.picture! || '/no-picture.jpg'}
            alt=""
          />
          <span className="shrink-0 text-[10px] font-[700] -tracking-[0.1px] text-pqMuted">
            {/* `dayjs.utc(...).local()`, the same reading the cell above uses to
                decide which hour row this card belongs in. `newDayjs(x)` parses
                the stored UTC string as local, so the card printed the UTC hour
                while sitting in the local one — a post scheduled for 07:00 read
                "04:00" to anyone three hours off UTC. */}
            {timeLabel}
          </span>
          {!!tagNames && (
            <span className="grid h-[14px] shrink-0 place-items-center truncate rounded-[4px] bg-pqSettings px-[4px] text-[9px] font-[700] text-pqMuted">
              {tagNames}
            </span>
          )}
          <span className="min-w-0 flex-1" />
          {state === 'ERROR' && (
            <span
              className="grid size-[14px] shrink-0 place-items-center rounded-full bg-pqDanger text-[10px] font-bold text-pqOnBrand"
              data-tooltip-id="tooltip"
              data-tooltip-content={
                post.error || 'An error occurred while publishing this post'
              }
            >
              !
            </span>
          )}
          {state === 'PUBLISHED' && (
            <span className="flex shrink-0 items-center gap-[4px] text-[8.5px] font-[700] uppercase tracking-[0.03em] text-pqOk">
              <span className="size-[5px] rounded-full bg-pqOk" aria-hidden />
              {t('published', 'Published')}
            </span>
          )}
          {/* Top-right status: design Draft chip + Scheduled (owner). Hover
              actions stay bottom-end so they don't cover this. */}
          {state === 'QUEUE' && (
            <span className="flex shrink-0 items-center gap-[4px] text-[8.5px] font-[700] uppercase tracking-[0.03em] text-pqFocused">
              <span
                className="size-[5px] rounded-full bg-pqFocused"
                aria-hidden
              />
              {t('scheduled', 'Scheduled')}
            </span>
          )}
          {state === 'DRAFT' && (
            <span className="shrink-0 text-[8.5px] font-[700] uppercase tracking-[0.03em] text-pqSoft">
              {t('draft', 'Draft')}
            </span>
          )}
        </div>
        <div
          className={clsx(
            'break-words text-start text-[11px] leading-[1.3] text-pqText',
            lineClamp === 1 ? 'line-clamp-1' : 'line-clamp-2'
          )}
        >
          {contentPreview}
        </div>
      </div>
      {/* Prototype: Open / Duplicate / Preview / Delete — no Statistics on
          calendar cells. Controls appear over the card on hover. */}
      <div
        data-ci-actions="1"
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-[3px] end-[3px] z-[5] flex gap-[1px] rounded-[6px] bg-pqSettings p-[2px] opacity-0 shadow-[inset_0_0_0_1px_var(--border)] transition-opacity focus-within:opacity-100 group-hover:opacity-100"
      >
        {copyDebugJson && !demo && (
          <button
            type="button"
            className={actionButton}
            onClick={copyDebugJson}
          >
            <CopyDebug />
          </button>
        )}
        {canEdit && (
          <button type="button" className={actionButton} onClick={onEdit}>
            <EditPost tooltip={demo ? demoTooltip : undefined} />
          </button>
        )}
        <button type="button" className={actionButton} onClick={onDuplicate}>
          <Duplicate tooltip={demo ? demoTooltip : undefined} />
        </button>
        <button type="button" className={actionButton} onClick={preview}>
          <Preview tooltip={demo ? demoTooltip : undefined} />
        </button>
        <button
          type="button"
          className={clsx(actionButton, 'hover:text-pqWarn')}
          onClick={onDelete}
        >
          <DeletePost tooltip={demo ? demoTooltip : undefined} />
        </button>
      </div>
    </div>
  );
});
/**
 * The list view's row — the design gives the Posts page a wider card than the
 * calendar cell: channel name, time and a status pill share the top line, the
 * tag chips get a row of their own, and the same floating action cluster the
 * calendar card uses appears on hover.
 */
const ListItem: FC<{
  editPost: () => void;
  duplicatePost: () => void;
  copyDebugJson?: () => void;
  deletePost: () => void;
  statistics: () => void;
  missingRelease?: () => void;
  post: Post & {
    integration: Integration;
    tags: {
      tag: Tags;
    }[];
  };
}> = memo((props) => {
  const t = useT();
  const { timePattern } = useDateFormat();
  const {
    editPost,
    duplicatePost,
    copyDebugJson,
    deletePost,
    statistics,
    missingRelease,
    post,
  } = props;
  const { disableXAnalytics } = useVariables();
  const state = displayPostState(post.state, post.publishDate);
  // Same as calendar cells: display may say Published for past QUEUE.
  const canEdit = post.state !== 'PUBLISHED';
  const demo = isClientDemoPost(post.id);
  const { explain: explainDemo, demoTooltip } = useDemoPostAction();
  // Design list cards always show the soft method pill (WEB/API/CLI/MCP).
  const showCreationMethodBadge =
    !!post.creationMethod && post.creationMethod !== 'UNKNOWN';
  const preview = useCallback(() => {
    if (demo) {
      explainDemo();
      return;
    }
    window.open(`/p/` + post.id + '?share=true', '_blank');
  }, [post, demo, explainDemo]);
  const onEdit = useCallback(() => {
    if (demo) {
      explainDemo();
      return;
    }
    editPost();
  }, [demo, editPost, explainDemo]);
  const onDuplicate = useCallback(() => {
    if (demo) {
      explainDemo();
      return;
    }
    duplicatePost();
  }, [demo, duplicatePost, explainDemo]);
  const onDelete = useCallback(() => {
    if (demo) {
      explainDemo();
      return;
    }
    deletePost();
  }, [demo, deletePost, explainDemo]);
  // Status, not tag: the list row shows its tags as chips below the content,
  // so the stripe is free to say published / draft / scheduled.
  const accent =
    state === 'PUBLISHED'
      ? 'var(--ok)'
      : state === 'DRAFT'
      ? 'var(--soft)'
      : state === 'ERROR'
      ? 'var(--warn)'
      : 'var(--brand)';
  const actionButton =
    'grid size-[26px] place-items-center rounded-[6px] text-pqMuted transition-colors hover:bg-pqSettings hover:text-pqText disabled:opacity-40';
  return (
    <div
      data-ci="1"
      onClick={onEdit}
      className="group relative flex w-full min-w-0 cursor-pointer overflow-hidden rounded-pqMd bg-pqPop text-start shadow-[inset_0_0_0_1px_var(--border)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--brand),var(--e2)]"
    >
      <span
        className="w-[3px] shrink-0"
        style={{
          background: accent,
          backgroundImage:
            state === 'DRAFT'
              ? 'repeating-linear-gradient(180deg, var(--soft) 0 3px, transparent 3px 6px)'
              : undefined,
        }}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-[9px] pb-[11px] pe-[13px] ps-[14px] pt-[12px]">
        <div className="flex min-w-0 items-center gap-[9px]">
          <img
            className="size-[26px] shrink-0 rounded-[8px] object-cover"
            src={`/icons/platforms/${post.integration?.providerIdentifier}.png`}
            alt=""
          />
          <img
            className="size-[26px] shrink-0 rounded-[8px] object-cover"
            src={post.integration.picture! || '/no-picture.jpg'}
            alt=""
          />
          <span className="min-w-0 truncate text-[13px] font-[600] text-pqText">
            {post.integration.name}
          </span>
          <span className="shrink-0 text-[12.5px] font-[600] text-pqSoft">
            {dayjs
              .utc(post.publishDate)
              .local()
              .format(timePattern())}
          </span>
          <span className="min-w-0 flex-1" />
          {state === 'ERROR' && (
            <span
              className="grid size-[14px] shrink-0 place-items-center rounded-full bg-pqDanger text-[10px] font-bold text-pqOnBrand"
              data-tooltip-id="tooltip"
              data-tooltip-content={
                post.error || 'An error occurred while publishing this post'
              }
            >
              !
            </span>
          )}
          {showCreationMethodBadge && (
            <span className="flex h-[17px] shrink-0 items-center rounded-[5px] bg-pqSettings px-[6px] text-[9px] font-[700] uppercase tracking-[0.04em] text-pqSoft">
              {post.creationMethod}
            </span>
          )}
          <span
            className={clsx(
              'flex h-[20px] shrink-0 items-center gap-[5px] rounded-full pe-[8px] ps-[7px] text-[11px] font-[600]',
              state === 'PUBLISHED'
                ? 'bg-pqOkSoft text-pqOk'
                : state === 'DRAFT'
                ? 'bg-pqSettings text-pqSoft'
                : state === 'ERROR'
                ? 'bg-pqWarnSoft text-pqWarn'
                : 'bg-pqBrandSoft text-pqBrand'
            )}
          >
            <span
              className="size-[5px] rounded-full bg-current"
              aria-hidden="true"
            />
            {state === 'PUBLISHED'
              ? t('published', 'Published')
              : state === 'DRAFT'
              ? t('draft', 'Draft')
              : state === 'ERROR'
              ? t('error', 'Error')
              : t('scheduled', 'Scheduled')}
          </span>
        </div>
        <div className="line-clamp-2 break-words text-start text-[13.5px] leading-[1.5] text-pqText">
          {stripHtmlValidation('none', post.content, false, true, false) ||
            t('no_content', 'no content')}
        </div>
        {!!post.tags?.length && (
          <div className="flex flex-wrap items-center gap-[5px]">
            {post.tags.map(({ tag }) => (
              <span
                key={tag.id || tag.name}
                className="flex h-[20px] items-center gap-[5px] rounded-[6px] bg-pqSettings pe-[8px] ps-[6px] text-[11px] font-[600] text-pqMuted"
              >
                <span
                  className="size-[6px] rounded-[2px]"
                  style={{ background: tag.color }}
                  aria-hidden="true"
                />
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div
        data-ci-actions="1"
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-[9px] end-[9px] z-[5] flex gap-[1px] rounded-[8px] bg-pqInner p-[2px] opacity-0 shadow-[var(--e2),inset_0_0_0_1px_var(--border)] transition-opacity focus-within:opacity-100 group-hover:opacity-100"
      >
        {copyDebugJson && !demo && (
          <button
            type="button"
            className={actionButton}
            onClick={copyDebugJson}
          >
            <CopyDebug />
          </button>
        )}
        {canEdit && (
          <button type="button" className={actionButton} onClick={onEdit}>
            <EditPost tooltip={demo ? demoTooltip : undefined} />
          </button>
        )}
        <button type="button" className={actionButton} onClick={onDuplicate}>
          <Duplicate tooltip={demo ? demoTooltip : undefined} />
        </button>
        <button type="button" className={actionButton} onClick={preview}>
          <Preview tooltip={demo ? demoTooltip : undefined} />
        </button>
        {!demo &&
          !(
            (post.integration.providerIdentifier === 'x' &&
              disableXAnalytics) ||
            !post.releaseId
          ) &&
          (post.releaseId === 'missing' && missingRelease ? (
            <button
              type="button"
              className={actionButton}
              onClick={missingRelease}
            >
              <Statistics />
            </button>
          ) : post.releaseId !== 'missing' ? (
            <button type="button" className={actionButton} onClick={statistics}>
              <Statistics />
            </button>
          ) : null)}
        <button
          type="button"
          className={clsx(actionButton, 'hover:text-pqWarn')}
          onClick={onDelete}
        >
          <DeletePost tooltip={demo ? demoTooltip : undefined} />
        </button>
      </div>
    </div>
  );
});

/**
 * One hour in Day's Posts-like list: date-header style time row, ListItem cards,
 * full-width Add row when empty. Drop → PUT /posts/:id/date; click Add → compose
 * (same WORK as the old day CalendarColumn slot).
 */
const DayHourSection: FC<{ hour: number; day: dayjs.Dayjs }> = memo(
  ({ hour, day }) => {
    const t = useT();
    const user = useUser();
    const { formatShortWeekdayTime } = useDateFormat();
    const getDate = useMemo(
      () => day.hour(hour).startOf('hour'),
      [day, hour]
    );
    const {
      integrations,
      posts,
      changeDate,
      reloadCalendarView,
      sets,
      signature,
      loading,
    } = useCalendar();
    const modal = useModals();
    const fetch = useFetch();
    const toaster = useToaster();
    const {
      editPost,
      deletePost,
      copyDebugJson,
      openStatistics,
      openMissingRelease,
    } = usePostActions();
    const addProvider = useAddProvider();

    const postList = useMemo(() => {
      return posts.filter((post) => {
        const pList = dayjs.utc(post.publishDate).local();
        return (
          pList.isSameOrAfter(getDate.startOf('hour')) &&
          pList.isBefore(getDate.endOf('hour'))
        );
      });
    }, [posts, getDate]);

    const [hourTick, setHourTick] = useState(0);
    const isBeforeNow = useMemo(() => {
      return getDate
        .startOf('hour')
        .isBefore(newDayjs().startOf('hour').utc());
    }, [getDate, hourTick]);

    useEffect(() => {
      const id = window.setInterval(() => setHourTick((n) => n + 1), 60_000);
      return () => window.clearInterval(id);
    }, []);

    const [{ canDrop, isTarget }, drop] = useDrop(
      () => ({
        accept: 'post',
        drop: async (item: any) => {
          if (isBeforeNow) return;

          const post = posts.find((p) => p.id === item.id);
          let action: 'schedule' | 'update' = 'schedule';

          if (
            post &&
            (post.state === 'PUBLISHED' ||
              (post.state === 'QUEUE' &&
                dayjs().isAfter(dayjs.utc(post.publishDate))))
          ) {
            const whatToDo = await new Promise<
              'schedule' | 'update' | 'cancel'
            >((resolve) => {
              modal.openModal({
                title: t('what_do_you_want_to_do', 'What do you want to do?'),
                children: (
                  <div className="flex flex-col">
                    <div className="text-[20px] mb-[20px]">
                      {t(
                        'post_already_published_drag',
                        'This post was already published, what do you want to do?'
                      )}
                    </div>
                    <div className="flex w-full gap-[10px]">
                      <div className="flex-1 flex">
                        <Button
                          type="button"
                          className="flex-1"
                          onClick={() => {
                            modal.closeAll();
                            resolve('update');
                          }}
                        >
                          {t(
                            'just_update_post_details',
                            'Just update the post details'
                          )}
                        </Button>
                      </div>
                      <div className="flex-1 flex">
                        <Button
                          type="button"
                          className="flex-1"
                          onClick={() => {
                            modal.closeAll();
                            resolve('schedule');
                          }}
                        >
                          {t('reschedule_post', 'Reschedule the post')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ),
                onClose: () => resolve('cancel'),
              });
            });

            if (whatToDo === 'cancel') {
              return;
            }
            action = whatToDo;
          }

          if (!item.interval) {
            changeDate(item.id, getDate);
          }
          const { status } = await fetch(`/posts/${item.id}/date`, {
            method: 'PUT',
            body: JSON.stringify({
              date: getDate.utc().format('YYYY-MM-DDTHH:mm:ss'),
              action,
            }),
          });
          if (status >= 200 && status < 300) {
            if (action === 'schedule') {
              toaster.show(
                t('scheduled_for_when', 'Scheduled for {when}').replace(
                  '{when}',
                  formatShortWeekdayTime(getDate)
                ),
                'success'
              );
            }
            if (item.interval || action === 'schedule') {
              reloadCalendarView();
            }
          }
        },
        collect: (monitor) => ({
          canDrop: isBeforeNow
            ? false
            : !!monitor.canDrop() && !!monitor.isOver(),
          isTarget: isBeforeNow
            ? false
            : !!monitor.canDrop() && !monitor.isOver(),
        }),
      }),
      [posts, changeDate, fetch, getDate, modal, reloadCalendarView, t, toaster, isBeforeNow]
    );

    const addModal = useCallback(async () => {
      if (isBeforeNow) return;
      const set: any = !sets.length
        ? undefined
        : await new Promise((resolve) => {
            modal.openModal({
              title: t('select_set', 'Select a Set'),
              closeOnClickOutside: true,
              askClose: false,
              closeOnEscape: true,
              withCloseButton: true,
              onClose: () => resolve('exit'),
              children: (
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
              ),
            });
          });

      if (set === 'exit') return;

      modal.openModal({
        id: 'add-edit-modal',
        closeOnClickOutside: false,
        removeLayout: true,
        closeOnEscape: false,
        withCloseButton: false,
        askClose: true,
        fullScreen: true,
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
              getDate.format('YYYY-MM-DDTHH:mm:ss') ===
              newDayjs().startOf('hour').format('YYYY-MM-DDTHH:mm:ss')
                ? newDayjs().add(10, 'minute')
                : getDate
            }
            {...(set?.content ? { set: JSON.parse(set.content) } : {})}
            reopenModal={() => ({})}
          />
        ),
        size: '80%',
      });
    }, [
      isBeforeNow,
      sets,
      modal,
      t,
      integrations,
      reloadCalendarView,
      signature,
      getDate,
    ]);

    const onAdd = useCallback(() => {
      if (isBeforeNow) return;
      if (integrations.length) {
        void addModal();
      } else {
        addProvider();
      }
    }, [isBeforeNow, integrations.length, addModal, addProvider]);

    const emptyLabel = isBeforeNow
      ? t('date_passed', 'Date passed')
      : t('add_a_post_at', 'Add a post at {{time}}').replace(
          '{{time}}',
          convertTimeFormatBasedOnLocality(hour)
        );

    return (
      <div
        ref={drop as any}
        data-dayslot="1"
        data-cal-hour={hour}
        data-filled={postList.length ? '1' : '0'}
        data-past={isBeforeNow ? '1' : '0'}
        className={clsx(
          'min-w-0',
          canDrop && 'rounded-pqMd shadow-[inset_0_0_0_2px_var(--brand)]',
          isTarget && 'rounded-pqMd shadow-[inset_0_0_0_1px_var(--dropHint)]',
          loading && 'animate-pulse'
        )}
      >
        <div className="flex items-center gap-[10px] px-[2px] pb-[9px] pt-[18px]">
          <span
            dir="ltr"
            className="shrink-0 text-[11.5px] font-[600] uppercase tracking-[0.05em] text-pqSoft"
          >
            {convertTimeFormatBasedOnLocality(hour)}
          </span>
          <span className="h-[1px] flex-1 bg-pqLine" aria-hidden="true" />
          {postList.length > 0 && (
            <span className="shrink-0 text-[11.5px] text-pqSoft">
              {postList.length}{' '}
              {postList.length === 1
                ? t('post', 'Post')
                : t('posts', 'Posts')}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-[6px]">
          {postList.map((post) => (
            <DayDraggableListItem
              key={post.id}
              post={post}
              statistics={openStatistics(post.id)}
              missingRelease={openMissingRelease(post.id)}
              editPost={editPost(post, false)}
              duplicatePost={editPost(post, true)}
              copyDebugJson={
                user?.isSuperAdmin ? copyDebugJson(post) : undefined
              }
              deletePost={deletePost(post)}
            />
          ))}
          {postList.length === 0 && (
            <button
              type="button"
              disabled={isBeforeNow}
              onClick={onAdd}
              className={clsx(
                'flex h-[44px] w-full items-center gap-[8px] rounded-pqMd px-[14px] text-start text-[13px] font-[500] shadow-[inset_0_0_0_1px_var(--border)] transition-colors',
                isBeforeNow
                  ? 'cursor-not-allowed text-pqSoft'
                  : 'cursor-pointer text-pqMuted hover:bg-pqHover hover:text-pqText hover:shadow-[inset_0_0_0_1px_var(--brand)]'
              )}
            >
              {!isBeforeNow && (
                <svg
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  fill="none"
                  aria-hidden="true"
                  className="shrink-0 text-pqSoft"
                >
                  <path
                    d="M12 5.5v13M5.5 12h13"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {emptyLabel}
            </button>
          )}
        </div>
      </div>
    );
  }
);

/** ListItem + drag source so Day hour drops still receive posts. */
const DayDraggableListItem: FC<{
  editPost: () => void;
  duplicatePost: () => void;
  copyDebugJson?: () => void;
  deletePost: () => void;
  statistics: () => void;
  missingRelease?: () => void;
  post: Post & {
    integration: Integration;
    tags: {
      tag: Tags;
    }[];
  };
}> = memo((props) => {
  const { post, ...rest } = props;
  const demo = isClientDemoPost(post.id);
  const [{ opacity }, dragRef] = useDrag(
    () => ({
      type: 'post',
      item: {
        id: post.id,
        interval: !!post.intervalInDays,
        state: post.state,
        source: 'calendar' as const,
      },
      canDrag: !demo,
      collect: (monitor) => ({
        opacity: monitor.isDragging() ? 0.4 : 1,
      }),
    }),
    [demo, post.id, post.intervalInDays, post.state]
  );
  return (
    <div ref={dragRef as any} style={{ opacity }} className="min-w-0">
      <ListItem post={post} {...rest} />
    </div>
  );
});

const DebugJsonModal: FC<{ post: any }> = ({ post }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { closeCurrent } = useModals();

  const copyPostId = useCallback(() => {
    copy(post.id);
    toaster.show(t('post_id_copied', 'Post ID copied to clipboard'), 'success');
    closeCurrent();
  }, [post, toaster, t, closeCurrent]);

  const copyJson = useCallback(async () => {
    try {
      const data = await (
        await fetch(`/posts/group/${post.group}/debug-export`)
      ).json();
      copy(JSON.stringify(data, null, 2));
      toaster.show(
        t('debug_json_copied', 'Debug JSON copied to clipboard'),
        'success'
      );
      closeCurrent();
    } catch {
      toaster.show(
        t('debug_json_copy_failed', 'Failed to copy debug data'),
        'warning'
      );
    }
  }, [fetch, post, toaster, t, closeCurrent]);

  return (
    <div className="flex flex-col gap-[16px] p-[16px]">
      <div className="text-textColor text-[14px]">
        {t('debug_choose_copy', 'Choose what you want to copy')}
      </div>
      <div className="flex gap-[10px]">
        <Button onClick={copyPostId}>
          {t('copy_post_id', 'Copy post id')}
        </Button>
        <Button secondary onClick={copyJson}>
          {t('copy_debug_json', 'Copy Debug JSON')}
        </Button>
      </div>
    </div>
  );
};
const CopyDebug = () => {
  const t = useT();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-tooltip-id="tooltip"
      data-tooltip-content={t('copy_debug_json', 'Copy Debug JSON')}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
};
type ActionIconProps = { tooltip?: string };

export const EditPost = ({ tooltip }: ActionIconProps = {}) => {
  const t = useT();
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      data-tooltip-id="tooltip"
      data-tooltip-content={tooltip ?? t('edit_post', 'Edit')}
    >
      <path
        d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const Duplicate = ({ tooltip }: ActionIconProps = {}) => {
  const t = useT();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 32 32"
      fill="none"
      data-tooltip-id="tooltip"
      data-tooltip-content={tooltip ?? t('duplicate_post', 'Duplicate Post')}
    >
      <path
        d="M27 5H9C8.46957 5 7.96086 5.21071 7.58579 5.58579C7.21071 5.96086 7 6.46957 7 7V9H5C4.46957 9 3.96086 9.21071 3.58579 9.58579C3.21071 9.96086 3 10.4696 3 11V25C3 25.5304 3.21071 26.0391 3.58579 26.4142C3.96086 26.7893 4.46957 27 5 27H23C23.5304 27 24.0391 26.7893 24.4142 26.4142C24.7893 26.0391 25 25.5304 25 25V23H27C27.5304 23 28.0391 22.7893 28.4142 22.4142C28.7893 22.0391 29 21.5304 29 21V7C29 6.46957 28.7893 5.96086 28.4142 5.58579C28.0391 5.21071 27.5304 5 27 5ZM23 11V13H5V11H23ZM23 25H5V15H23V25ZM27 21H25V11C25 10.4696 24.7893 9.96086 24.4142 9.58579C24.0391 9.21071 23.5304 9 23 9H9V7H27V21Z"
        fill="currentColor"
      />
    </svg>
  );
};
const Preview = ({ tooltip }: ActionIconProps = {}) => {
  const t = useT();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 32 32"
      fill="none"
      data-tooltip-id="tooltip"
      data-tooltip-content={tooltip ?? t('preview_post', 'Preview Post')}
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

export const DeletePost = ({ tooltip }: ActionIconProps = {}) => {
  const t = useT();
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      data-tooltip-id="tooltip"
      data-tooltip-content={tooltip ?? t('delete_post', 'Delete Post')}
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
    <div className="flex flex-col gap-[14px]">
      <div className="flex max-h-[240px] flex-col gap-[6px] overflow-y-auto">
        {sets.map((set) => (
          <button
            key={set.id}
            type="button"
            onClick={() => onSelect(set)}
            className="w-full rounded-pqMd bg-pqPop px-[15px] py-[13px] text-start shadow-[inset_0_0_0_1px_var(--border)] transition-shadow hover:bg-pqHover hover:shadow-[inset_0_0_0_1px_var(--brand)]"
          >
            <div className="text-[13.5px] font-[600] text-pqText">{set.name}</div>
            {set.description && (
              <div className="mt-[3px] text-[12.5px] text-pqMuted">
                {set.description}
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="flex justify-center border-t border-pqLine pt-[12px]">
        <button
          type="button"
          data-pq="continue-without-set"
          onClick={onContinueWithoutSet}
          className="flex h-[36px] items-center justify-center rounded-pqSm px-[16px] text-[13px] font-[500] text-pqMuted transition-colors hover:bg-pqHover hover:text-pqText"
        >
          {t('continue_without_set', 'Continue without set')}
        </button>
      </div>
    </div>
  );
};
