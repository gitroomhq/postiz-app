'use client';

import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import {
  FC,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useClickAway } from '@uidotdev/usehooks';
import ReactLoading from '@gitroom/frontend/components/layout/loading';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useAnchoredPopover } from '@gitroom/frontend/components/layout/use.anchored.popover';
import { useDateFormat } from '@gitroom/frontend/components/launches/helpers/date.format';
import { splitNotificationContent } from '@gitroom/frontend/components/notifications/notification.look';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';
import { MobileSheet } from '@gitroom/frontend/components/layout/mobile-sheet';

export const ShowNotification: FC<{
  notification: {
    id: string;
    createdAt: string;
    content: string;
  };
  /** Frozen lastRead from when the popover first loaded list data this open. */
  unreadCutoff: string;
  /** Local clear from "Mark all read". */
  forceRead?: boolean;
}> = (props) => {
  const { notification, forceRead, unreadCutoff } = props;
  const unread =
    !forceRead &&
    new Date(notification.createdAt) > new Date(unreadCutoff);
  const createdAt = dayjs(notification.createdAt);
  const isWithin24h = dayjs().diff(createdAt, 'hour') < 24;
  const { mediumDateTimePattern } = useDateFormat();
  const t = useT();
  const fullDate = createdAt.format(mediumDateTimePattern());
  const { text, url, kind } = splitNotificationContent(notification.content);
  return (
    <div
      className={clsx(
        'flex gap-[10px] border-b border-pqLine px-[16px] py-[11px] last:border-b-0',
        unread ? 'bg-pqBrandSoft' : 'bg-transparent'
      )}
    >
      {kind === 'success' ? (
        <span
          className="mt-[2px] grid size-[18px] shrink-0 place-items-center rounded-full bg-pqOk text-white"
          aria-hidden="true"
        >
          <svg viewBox="0 0 12 12" width="10" height="10" fill="none">
            <path
              d="M2.4 6.2 4.8 8.6 9.6 3.4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      ) : kind === 'fail' ? (
        <span
          className="mt-[2px] grid size-[18px] shrink-0 place-items-center rounded-full bg-pqDanger text-white"
          aria-hidden="true"
        >
          <svg viewBox="0 0 12 12" width="9" height="9" fill="none">
            <path
              d="M3 3l6 6M9 3 3 9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>
      ) : (
        <span
          className={clsx(
            'mt-[6px] size-[6px] shrink-0 rounded-full',
            unread ? 'bg-pqBrand' : 'bg-transparent'
          )}
          aria-hidden="true"
        />
      )}
      <div className="min-w-0 flex-1 overflow-hidden">
        <div
          className={clsx(
            'break-words text-[13.5px] leading-[1.5] text-pqText [overflow-wrap:anywhere]',
            unread ? 'font-[600]' : 'font-[400]'
          )}
        >
          {text}
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-[4px] inline-flex text-[12.5px] font-[600] text-pqBrand hover:underline"
          >
            {kind === 'success'
              ? t('view_post', 'View post')
              : t('open_link', 'Open link')}
          </a>
        )}
        <div
          className="mt-[3px] text-[11.5px] font-normal text-pqSoft"
          title={isWithin24h ? fullDate : undefined}
        >
          {isWithin24h ? createdAt.fromNow() : fullDate}
        </div>
      </div>
    </div>
  );
};

export const NotificationOpenComponent = forwardRef<
  HTMLDivElement,
  {
    markedAllRead: boolean;
    onMarkAllRead: () => void;
    /** Bumps each open so SWR never paints a stale lastRead from a prior open. */
    listSession: number;
    unreadCutoff: string | null;
    onUnreadCutoff: (cutoff: string) => void;
    embedded?: boolean;
  }
>(function NotificationOpenComponent(
  { markedAllRead, onMarkAllRead, listSession, unreadCutoff, onUnreadCutoff, embedded },
  ref
) {
  const fetch = useFetch();
  const loadNotifications = useCallback(async () => {
    return await (await fetch('/notifications/list')).json();
  }, [fetch]);
  const t = useT();
  const badgeCleared = useRef(false);

  const { data, isLoading } = useSWR(
    ['notifications', listSession],
    loadNotifications
  );

  // Freeze the pre-read cutoff from the first list payload this open.
  useEffect(() => {
    if (!data || unreadCutoff !== null) {
      return;
    }
    onUnreadCutoff(
      data.lastReadNotifications ?? new Date(0).toISOString()
    );
  }, [data, unreadCutoff, onUnreadCutoff]);

  // Clear server unread (badge) after we have captured the cutoff for styling.
  // Matches prior WORK (open cleared lastRead) without wiping unread LOOK.
  useEffect(() => {
    if (!data || unreadCutoff === null || badgeCleared.current) {
      return;
    }
    badgeCleared.current = true;
    void fetch('/notifications/read', { method: 'POST' });
  }, [data, unreadCutoff, fetch]);

  const hasUnread =
    !markedAllRead &&
    unreadCutoff !== null &&
    !!data?.notifications?.some(
      (n: { createdAt: string }) =>
        new Date(n.createdAt) > new Date(unreadCutoff)
    );

  return (
    <div
      ref={ref}
      id="notification-popup"
      className={clsx(
        'flex min-h-[200px] cursor-default flex-col overflow-hidden bg-pqInner text-pqText',
        embedded
          ? 'w-full'
          : 'z-[600] w-[380px] max-w-[calc(100vw-16px)] rounded-pqLg border border-pqBorder shadow-pq animate-pqPop'
      )}
    >
      <div className="flex items-center border-b border-pqLine px-[16px] py-[12px]">
        {!embedded && (
          <span className="flex-1 text-[14px] font-[600]">
            {t('notifications', 'Notifications')}
          </span>
        )}
        <button
          type="button"
          onClick={onMarkAllRead}
          disabled={!hasUnread}
          className={clsx(
            'border-0 bg-transparent font-inherit text-[12.5px] text-pqBrand',
            embedded && 'ms-auto',
            hasUnread
              ? 'cursor-pointer hover:underline'
              : 'cursor-default opacity-40'
          )}
        >
          {t('mark_all_read', 'Mark all read')}
        </button>
      </div>

      <div
        className={clsx(
          'flex flex-col overflow-y-auto scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor',
          embedded ? 'max-h-none' : 'max-h-[380px]'
        )}
      >
        {isLoading && (
          <div className="flex flex-1 justify-center pt-12 text-pqText">
            <ReactLoading width={36} height={36} />
          </div>
        )}
        {!isLoading && !data?.notifications?.length && (
          <div className="mt-[20px] flex flex-1 items-center justify-center p-[16px] text-center text-pqSoft">
            {t('no_notifications', 'No notifications')}
          </div>
        )}
        {/* `data?.notifications?.length` three lines up is the safe form; this
            one dereferenced straight through. `unreadCutoff` is set from any
            truthy `data`, so a `{statusCode, message}` error body satisfied the
            guard and `.map` threw. */}
        {!isLoading &&
          unreadCutoff !== null &&
          data?.notifications?.map(
            (notification: {
              id: string;
              createdAt: string;
              content: string;
            }) => (
              <ShowNotification
                notification={notification}
                unreadCutoff={unreadCutoff}
                forceRead={markedAllRead}
                key={notification.id}
              />
            )
          )}
      </div>
    </div>
  );
});

const NotificationComponent = () => {
  const fetch = useFetch();
  const t = useT();
  const toaster = useToaster();
  const { mobile } = useViewport();
  const [show, setShow] = useState(false);
  const [markedAllRead, setMarkedAllRead] = useState(false);
  const [unreadCutoff, setUnreadCutoff] = useState<string | null>(null);
  const [listSession, setListSession] = useState(0);
  const loadNotifications = useCallback(async () => {
    return await (await fetch('/notifications')).json();
  }, [fetch]);
  const { data, mutate } = useSWR('notifications-list', loadNotifications);
  const changeShow = useCallback(() => {
    mutate(
      {
        ...data,
        total: 0,
      },
      {
        revalidate: false,
      }
    );
    setShow((open) => {
      if (open) {
        return false;
      }
      // Fresh open: new list session + capture unread LOOK before POST /read.
      setMarkedAllRead(false);
      setUnreadCutoff(null);
      setListSession((n) => n + 1);
      return true;
    });
  }, [data, mutate]);
  const markAllRead = useCallback(() => {
    // Open already POSTs /notifications/read for the badge; call again so an
    // explicit Mark all read still persists if that request failed.
    void fetch('/notifications/read', { method: 'POST' });
    setMarkedAllRead(true);
    mutate({ ...data, total: 0 }, { revalidate: false });
    toaster.show(
      t(
        'all_notifications_marked_as_read',
        'All notifications marked as read'
      )
    );
  }, [data, fetch, mutate, t, toaster]);
  const onUnreadCutoff = useCallback((cutoff: string) => {
    setUnreadCutoff(cutoff);
  }, []);
  const ref = useClickAway<HTMLDivElement>(() => {
    if (!mobile) setShow(false);
  });
  const { referenceRef, floatingRef } = useAnchoredPopover<
    HTMLButtonElement,
    HTMLDivElement
  >(show, 'end', { offsetPx: 10 });
  return (
    <div className="relative cursor-pointer select-none" ref={ref}>
      <button
        type="button"
        ref={referenceRef}
        onClick={changeShow}
        aria-label={t('notifications', 'Notifications')}
        aria-expanded={show}
        className={clsx(
          'relative grid place-items-center rounded-[8px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqText',
          mobile ? 'size-[44px]' : 'size-[30px]',
          show && 'bg-pqHover text-pqText'
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M14 21H10M18 8C18 6.4087 17.3679 4.88258 16.2427 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.8826 2.63214 7.75738 3.75736C6.63216 4.88258 6.00002 6.4087 6.00002 8C6.00002 11.0902 5.22049 13.206 4.34968 14.6054C3.61515 15.7859 3.24788 16.3761 3.26134 16.5408C3.27626 16.7231 3.31488 16.7926 3.46179 16.9016C3.59448 17 4.19261 17 5.38887 17H18.6112C19.8074 17 20.4056 17 20.5382 16.9016C20.6852 16.7926 20.7238 16.7231 20.7387 16.5408C20.7522 16.3761 20.3849 15.7859 19.6504 14.6054C18.7795 13.206 18 11.0902 18 8Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {data && data.total > 0 && (
          <span
            className="absolute end-[6px] top-[5px] size-[7px] rounded-full bg-pqPink shadow-[0_0_0_2px_var(--rail)]"
            aria-hidden="true"
          />
        )}
      </button>
      {show &&
        (mobile ? (
          <MobileSheet
            open={show}
            onClose={() => setShow(false)}
            title={t('notifications', 'Notifications')}
          >
            <NotificationOpenComponent
              markedAllRead={markedAllRead}
              onMarkAllRead={markAllRead}
              listSession={listSession}
              unreadCutoff={unreadCutoff}
              onUnreadCutoff={onUnreadCutoff}
              embedded
            />
          </MobileSheet>
        ) : (
          <NotificationOpenComponent
            ref={floatingRef}
            markedAllRead={markedAllRead}
            onMarkAllRead={markAllRead}
            listSession={listSession}
            unreadCutoff={unreadCutoff}
            onUnreadCutoff={onUnreadCutoff}
          />
        ))}
    </div>
  );
};
export default NotificationComponent;
