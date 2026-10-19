'use client';

import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useClickAway } from '@uidotdev/usehooks';
import ReactLoading from '@gitroom/frontend/components/layout/loading';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
// notifications are plain text, the urls in them become short links
function replaceLinks(text: string) {
  const urlRegex =
    /(\bhttps?:\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi;
  return text.split(urlRegex).map((part, index) => {
    if (index % 2 === 0) {
      return part;
    }
    return (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        title={part}
        className="lbox inline-block max-w-full truncate align-bottom font-[500] underline decoration-newTextColor/30 underline-offset-[3px] hover:decoration-newTextColor"
      >
        {part.replace(/^https?:\/\/(www\.)?/i, '')}
      </a>
    );
  });
}
export const ShowNotification: FC<{
  notification: {
    createdAt: string;
    content: string;
  };
  newNotification: boolean;
}> = (props) => {
  const { notification, newNotification } = props;
  const createdAt = newDayjs(notification.createdAt);
  const isWithin24h = newDayjs().diff(createdAt, 'hour') < 24;
  const fullDate = createdAt.format('MMM D, YYYY h:mm A');
  return (
    <div className="flex gap-[12px] px-[16px] py-[14px] border-b border-newTableBorder last:border-b-0">
      <div className="flex-1 min-w-0 flex flex-col gap-[4px]">
        <div className="text-[14px] leading-[20px] break-words">
          {replaceLinks(notification.content)}
        </div>
        <div
          className="text-[12px] text-textItemBlur"
          title={isWithin24h ? fullDate : undefined}
        >
          {isWithin24h ? createdAt.fromNow() : fullDate}
        </div>
      </div>
      {newNotification && (
        <div className="w-[8px] h-[8px] mt-[6px] rounded-full bg-[#FF3EA2] shrink-0" />
      )}
    </div>
  );
};
// every call marks the notifications as read, so it only runs when the popup opens
const useNotificationsList = () => {
  const fetch = useFetch();
  return useSWR(
    'notifications',
    async () => {
      return await (await fetch('/notifications/list')).json();
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 0,
    }
  );
};
export const NotificationOpenComponent = () => {
  const t = useT();
  const { data, isLoading, isValidating } = useNotificationsList();
  const notifications: { createdAt: string; content: string }[] =
    data?.notifications || [];
  // reopening shows the cached list first, only the fresh one knows what is new
  const isNew = (createdAt: string) =>
    !isValidating &&
    new Date(createdAt) > new Date(data?.lastReadNotifications);
  const newCount = notifications.filter((p) => isNew(p.createdAt)).length;
  return (
    <div
      id="notification-popup"
      className={clsx(
        'opacity-0 animate-normalFadeDown mt-[10px] absolute w-[400px] top-[100%] end-0 bg-newBgColorInner text-newTextColor rounded-[12px] flex flex-col border border-newTableBorder shadow-menu overflow-hidden z-[600]',
        // on phones it spans the top bar, the ! beats the end-0 of tailwindcss-rtl
        'mobile:mt-0 mobile:w-auto mobile:start-[8px] mobile:!end-[8px]'
      )}
    >
      <div className="flex items-center gap-[8px] h-[56px] px-[16px] border-b border-newTableBorder">
        <div className="flex-1 text-[16px] font-[600]">
          {t('notifications', 'Notifications')}
        </div>
        {!!newCount && (
          <div className="h-[20px] min-w-[20px] px-[6px] rounded-full bg-[#FF3EA2] text-white text-[12px] font-[600] flex items-center justify-center">
            {newCount}
          </div>
        )}
      </div>

      <div className="flex flex-col max-h-[440px] overflow-y-auto scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner">
        {isLoading && (
          <div className="h-[160px] flex justify-center items-center">
            <ReactLoading type="spin" width={32} height={32} />
          </div>
        )}
        {!isLoading && !notifications.length && (
          <div className="flex flex-col items-center justify-center gap-[12px] py-[40px] px-[16px] text-center">
            <div className="w-[48px] h-[48px] rounded-full bg-[#612bd3]/10 flex items-center justify-center text-[#612bd3]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </div>
            <div className="text-[15px] text-newTableText">
              {t('no_notifications', 'No notifications')}
            </div>
          </div>
        )}
        {!isLoading &&
          notifications.map((notification, index) => (
            <ShowNotification
              notification={notification}
              newNotification={isNew(notification.createdAt)}
              key={`notifications_${index}`}
            />
          ))}
      </div>
    </div>
  );
};
const NotificationComponent = () => {
  const fetch = useFetch();
  const [show, setShow] = useState(false);
  const loadNotifications = useCallback(async () => {
    return await (await fetch('/notifications')).json();
  }, []);
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
    setShow(!show);
  }, [show, data]);
  const ref = useClickAway<HTMLDivElement>(() => setShow(false));
  return (
    // on phones the popup spans the top bar instead of hanging off the bell
    <div className="relative mobile:static" ref={ref}>
      <div className="cursor-pointer select-none" onClick={changeShow}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className={clsx(
            'hover:text-newTextColor',
            show && 'text-newTextColor'
          )}
        >
          <path
            d="M14 21H10M18 8C18 6.4087 17.3679 4.88258 16.2427 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.8826 2.63214 7.75738 3.75736C6.63216 4.88258 6.00002 6.4087 6.00002 8C6.00002 11.0902 5.22049 13.206 4.34968 14.6054C3.61515 15.7859 3.24788 16.3761 3.26134 16.5408C3.27626 16.7231 3.31488 16.7926 3.46179 16.9016C3.59448 17 4.19261 17 5.38887 17H18.6112C19.8074 17 20.4056 17 20.5382 16.9016C20.6852 16.7926 20.7238 16.7231 20.7387 16.5408C20.7522 16.3761 20.3849 15.7859 19.6504 14.6054C18.7795 13.206 18 11.0902 18 8Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {data && data.total > 0 && (
            <circle
              cx="17.0625"
              cy="5"
              r="4"
              fill="#FF3EA2"
              stroke="currentColor"
              strokeWidth="2"
              className="text-newBgColorInner"
            />
          )}
        </svg>
      </div>
      {show && <NotificationOpenComponent />}
    </div>
  );
};
export default NotificationComponent;
