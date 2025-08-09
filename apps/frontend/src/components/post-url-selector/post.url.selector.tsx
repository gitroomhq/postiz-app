'use client';

import { EventEmitter } from 'events';
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import dayjs from 'dayjs';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import removeMd from 'remove-markdown';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
const postUrlEmitter = new EventEmitter();
export const ShowPostSelector = () => {
  const [showPostSelector, setShowPostSelector] = useState(false);
  const [callback, setCallback] = useState<{
    callback: (tag: string | undefined) => void;
  } | null>({
    callback: (tag: string | undefined) => {
      return tag;
    },
  } as any);
  const [date, setDate] = useState(newDayjs());
  useEffect(() => {
    postUrlEmitter.on(
      'show',
      (params: {
        date: dayjs.Dayjs;
        callback: (url: string | undefined) => void;
      }) => {
        setCallback(params);
        setDate(params.date);
        setShowPostSelector(true);
      }
    );
    return () => {
      setShowPostSelector(false);
      setCallback(null);
      setDate(newDayjs());
      postUrlEmitter.removeAllListeners();
    };
  }, []);
  const close = useCallback(() => {
    setShowPostSelector(false);
    setCallback(null);
    setDate(newDayjs());
  }, []);
  if (!showPostSelector) {
    return <></>;
  }
  return (
    <PostSelector onClose={close} onSelect={callback?.callback!} date={date} />
  );
};
export const showPostSelector = (date: dayjs.Dayjs) => {
  return new Promise<string>((resolve) => {
    postUrlEmitter.emit('show', {
      date,
      callback: (tag: string) => {
        resolve(tag);
      },
    });
  });
};
export const useShowPostSelector = (day: dayjs.Dayjs) => {
  return useCallback(() => {
    return showPostSelector(day);
  }, [day]);
};
export const PostSelector: FC<{
  onClose: () => void;
  onSelect: (tag: string | undefined) => void;
  only?: 'article' | 'social';
  noModal?: boolean;
  date: dayjs.Dayjs;
}> = (props) => {
  const { onClose, onSelect, only, date, noModal } = props;
  const fetch = useFetch();
  const fetchOldPosts = useCallback(() => {
    return fetch(
      '/posts/old?date=' + date.utc().format('YYYY-MM-DDTHH:mm:00'),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    ).then((res) => res.json());
  }, [date]);
  const onCloseWithEmptyString = useCallback(() => {
    onSelect('');
    onClose();
  }, []);
  const [current, setCurrent] = useState<string | undefined>(undefined);
  const select = useCallback(
    (id: string) => () => {
      setCurrent(current === id ? undefined : id);
      onSelect(current === id ? undefined : `(post:${id})`);
      onClose();
    },
    [current]
  );
  const { data: loadData } = useSWR('old-posts', fetchOldPosts);
  const data = useMemo(() => {
    if (!only) {
      return loadData;
    }
    return loadData?.filter((p: any) => p.integration.type === only);
  }, [loadData, only]);

  const t = useT();

  return (
    <>
      {!noModal ||
        (data?.length > 0 && (
          <div
            className={
              !noModal
                ? 'text-textColor fixed start-0 top-0 bg-primary/80 z-[300] w-full h-full p-[60px] animate-fade'
                : ''
            }
          >
            <div
              className={
                !noModal
                  ? 'flex flex-col w-full max-w-[1200px] mx-auto h-full bg-sixth border-tableBorder border-2 rounded-xl pb-[20px] px-[20px] relative'
                  : ''
              }
            >
              {!noModal && (
                <div className="flex">
                  <div className="flex-1">
                    <TopTitle
                      title={
                        'Select Post Before ' +
                        date.format('DD/MM/YYYY HH:mm:ss')
                      }
                    />
                  </div>
                  <button
                    onClick={onCloseWithEmptyString}
                    className="outline-none absolute end-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root bg-primary hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
                    type="button"
                  >
                    <svg
                      viewBox="0 0 15 15"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                    >
                      <path
                        d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                        fill="currentColor"
                        fillRule="evenodd"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </button>
                </div>
              )}
              {!!data && data.length > 0 && (
                <div className="mt-[10px]">
                  <div className="flex flex-row flex-wrap gap-[10px]">
                    {data.map((p: any) => (
                      <div
                        onClick={select(p.id)}
                        className={clsx(
                          'cursor-pointer overflow-hidden flex gap-[20px] flex-col w-[200px] h-[200px] text-ellipsis p-3 border border-tableBorder rounded-[8px] hover:bg-primary',
                          current === p.id ? 'bg-primary' : 'bg-secondary'
                        )}
                        key={p.id}
                      >
                        <div className="flex gap-[10px] items-center">
                          <div className="relative">
                            <img
                              src={p.integration.picture}
                              className="w-[32px] h-[32px] rounded-full"
                            />
                            <img
                              className="w-[20px] h-[20px] rounded-full absolute z-10 -bottom-[5px] -end-[5px] border border-fifth"
                              src={
                                `/icons/platforms/` +
                                p?.integration?.providerIdentifier +
                                '.png'
                              }
                            />
                          </div>
                          <div>{p.integration.name}</div>
                        </div>
                        <div className="flex-1">{removeMd(p.content)}</div>
                        <div>
                          {t('status', 'Status:')}
                          {p.state}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
    </>
  );
};
