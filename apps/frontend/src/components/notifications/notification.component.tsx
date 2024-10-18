'use client';

import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import { useClickAway } from '@uidotdev/usehooks';
import interClass from '@gitroom/react/helpers/inter.font';
import ReactLoading from 'react-loading';

import { ReactComponent as BellSvg } from '@gitroom/frontend/assets/bell.svg';

function replaceLinks(text: string) {
  const urlRegex =
    /(\bhttps?:\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi;
  return text.replace(
    urlRegex,
    '<a class="cursor-pointer underline font-bold" target="_blank" href="$1">$1</a>'
  );
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
    <div className="opacity-0 animate-normalFadeDown mt-[10px] absolute w-[420px] min-h-[200px] top-[100%] right-0 bg-third text-textColor rounded-[16px] flex flex-col border border-tableBorder">
      <div
        className={`p-[16px] border-b border-tableBorder ${interClass} font-bold`}
      >
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
        <BellSvg />
      </div>
      {show && <NotificationOpenComponent />}
    </div>
  );
};

export default NotificationComponent;
