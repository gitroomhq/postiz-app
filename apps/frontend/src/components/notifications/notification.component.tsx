'use client';

import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import { useClickAway } from '@uidotdev/usehooks';
import interClass from '@gitroom/react/helpers/inter.font';
import ReactLoading from 'react-loading';

function replaceLinks(text: string) {
  const urlRegex =
    /(\bhttps?:\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi;
  return text.replace(urlRegex, '<a class="cursor-pointer underline font-bold" target="_blank" href="$1">$1</a>');
}

export const ShowNotification: FC<{
  notification: { createdAt: string; content: string };
  lastReadNotification: string;
}> = (props) => {
  const { notification } = props;
  const [newNotification] = useState(
    new Date(notification.createdAt) > new Date(props.lastReadNotification)
  );

  return (
    <div
      className={clsx(
        `text-textColor px-[16px] py-[10px] border-b border-tableBorder last:border-b-0 transition-colors ${interClass} overflow-hidden text-ellipsis`,
        newNotification && 'font-bold bg-seventh animate-newMessages'
      )}
      dangerouslySetInnerHTML={{ __html: replaceLinks(notification.content) }}
    />
  );
};
export const NotificationOpenComponent = () => {
  const fetch = useFetch();
  const loadNotifications = useCallback(async () => {
    return await (await fetch('/notifications/list')).json();
  }, []);

  const { data, isLoading } = useSWR('notifications', loadNotifications);

  return (
    <div id="notification-popup" className="opacity-0 animate-normalFadeDown mt-[10px] absolute w-[420px] min-h-[200px] top-[100%] right-0 bg-third text-textColor rounded-[16px] flex flex-col border border-tableBorder z-[2]">
      <div className={`p-[16px] border-b border-tableBorder ${interClass} font-bold`}>
        Notifications
      </div>

      <div className="flex flex-col">
        {isLoading && (
          <div className="flex-1 flex justify-center pt-12">
            <ReactLoading type="spin" color="#fff" width={36} height={36} />
          </div>
        )}
        {!isLoading && !data.notifications.length && (
          <div className="text-center p-[16px] text-textColor flex-1 flex justify-center items-center mt-[20px]">
            No notifications
          </div>
        )}
        {!isLoading &&
          data.notifications.map(
            (
              notification: { createdAt: string; content: string },
              index: number
            ) => (
              <ShowNotification
                notification={notification}
                lastReadNotification={data.lastReadNotifications}
                key={`notifications_${index}`}
              />
            )
          )}
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
      { ...data, total: 0 },
      {
        revalidate: false,
      }
    );
    setShow(!show);
  }, [show, data]);

  const ref = useClickAway<HTMLDivElement>(() => setShow(false));

  return (
    <div className="relative cursor-pointer select-none" ref={ref}>
      <div onClick={changeShow}>
        {data && data.total > 0 && (
          <div className="w-[13px] h-[13px] bg-red-500 rounded-full absolute -left-[2px] -top-[2px] text-[10px] text-center flex justify-center items-center">
            {data.total}
          </div>
        )}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M20.7927 16.4944C20.2724 15.5981 19.4989 13.0622 19.4989 9.75C19.4989 7.76088 18.7087 5.85322 17.3022 4.4467C15.8957 3.04018 13.988 2.25 11.9989 2.25C10.0098 2.25 8.10214 3.04018 6.69561 4.4467C5.28909 5.85322 4.49891 7.76088 4.49891 9.75C4.49891 13.0631 3.72454 15.5981 3.20423 16.4944C3.07135 16.7222 3.00091 16.9811 3.00001 17.2449C2.9991 17.5086 3.06776 17.768 3.19907 17.9967C3.33037 18.2255 3.51968 18.4156 3.74789 18.5478C3.9761 18.6801 4.23515 18.7498 4.49891 18.75H8.32485C8.49789 19.5967 8.95806 20.3577 9.62754 20.9042C10.297 21.4507 11.1347 21.7492 11.9989 21.7492C12.8631 21.7492 13.7008 21.4507 14.3703 20.9042C15.0398 20.3577 15.4999 19.5967 15.673 18.75H19.4989C19.7626 18.7496 20.0215 18.6798 20.2496 18.5475C20.4777 18.4151 20.6669 18.225 20.7981 17.9963C20.9292 17.7676 20.9978 17.5083 20.9969 17.2446C20.9959 16.9809 20.9255 16.7222 20.7927 16.4944ZM11.9989 20.25C11.5337 20.2499 11.0801 20.1055 10.7003 19.8369C10.3205 19.5683 10.0333 19.1886 9.87829 18.75H14.1195C13.9645 19.1886 13.6773 19.5683 13.2975 19.8369C12.9178 20.1055 12.4641 20.2499 11.9989 20.25ZM4.49891 17.25C5.22079 16.0087 5.99891 13.1325 5.99891 9.75C5.99891 8.1587 6.63105 6.63258 7.75627 5.50736C8.88149 4.38214 10.4076 3.75 11.9989 3.75C13.5902 3.75 15.1163 4.38214 16.2416 5.50736C17.3668 6.63258 17.9989 8.1587 17.9989 9.75C17.9989 13.1297 18.7752 16.0059 19.4989 17.25H4.49891Z"
            fill="currentColor"
          />
        </svg>
      </div>
      {show && <NotificationOpenComponent />}
    </div>
  );
};

export default NotificationComponent;
