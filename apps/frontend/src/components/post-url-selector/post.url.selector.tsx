'use client';

import { EventEmitter } from 'events';
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import {
  executeCommand,
  ExecuteState,
  ICommand,
  selectWord,
  TextAreaTextApi,
} from '@uiw/react-md-editor';
import dayjs from 'dayjs';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import removeMd from 'remove-markdown';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
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
  const [date, setDate] = useState(dayjs());
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
      setDate(dayjs());
      postUrlEmitter.removeAllListeners();
    };
  }, []);
  const close = useCallback(() => {
    setShowPostSelector(false);
    setCallback(null);
    setDate(dayjs());
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
export const postSelector = (date: dayjs.Dayjs): ICommand => ({
  name: 'postselector',
  keyCommand: 'postselector',
  shortcuts: 'ctrlcmd+p',
  prefix: '(post:',
  suffix: ')',
  buttonProps: {
    'aria-label': 'Add Post Url',
    title: 'Add Post Url',
  },
  icon: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="13"
      viewBox="0 0 32 32"
      fill="currentColor"
    >
      <path
        d="M27.4602 14.6576C27.4039 14.4173 27.2893 14.1947 27.1264 14.0093C26.9635 13.824 26.7575 13.6817 26.5264 13.5951L19.7214 11.0438L21.4714 2.2938C21.5354 1.97378 21.4933 1.64163 21.3514 1.34773C21.2095 1.05382 20.9757 0.814201 20.6854 0.665207C20.395 0.516214 20.064 0.465978 19.7425 0.52212C19.421 0.578262 19.1266 0.737718 18.9039 0.976302L4.90393 15.9763C4.73549 16.1566 4.61413 16.3756 4.55059 16.614C4.48705 16.8525 4.4833 17.1028 4.53968 17.343C4.59605 17.5832 4.7108 17.8058 4.87377 17.9911C5.03673 18.1763 5.24287 18.3185 5.47393 18.4051L12.2789 20.9563L10.5289 29.7063C10.465 30.0263 10.5071 30.3585 10.649 30.6524C10.7908 30.9463 11.0247 31.1859 11.315 31.3349C11.6054 31.4839 11.9364 31.5341 12.2579 31.478C12.5794 31.4218 12.8738 31.2624 13.0964 31.0238L27.0964 16.0238C27.2647 15.8435 27.3859 15.6245 27.4494 15.3862C27.5128 15.1479 27.5165 14.8976 27.4602 14.6576ZM14.5064 25.1163L15.4714 20.2938C15.5412 19.9446 15.4845 19.5819 15.3113 19.2706C15.1382 18.9594 14.86 18.7199 14.5264 18.5951L8.62518 16.3838L17.4914 6.8838L16.5264 11.7063C16.4566 12.0555 16.5134 12.4182 16.6865 12.7295C16.8597 13.0407 17.1379 13.2802 17.4714 13.4051L23.3752 15.6163L14.5064 25.1163Z"
        fill="currentColor"
      />
    </svg>
  ),
  execute: async (state: ExecuteState, api: TextAreaTextApi) => {
    const newSelectionRange = selectWord({
      text: state.text,
      selection: state.selection,
      prefix: state.command.prefix!,
      suffix: state.command.suffix,
    });
    const state1 = api.setSelectionRange(newSelectionRange);
    const media = await showPostSelector(date);
    executeCommand({
      api,
      selectedText: state1.selectedText,
      selection: state.selection,
      prefix: media,
      suffix: '',
    });
  },
});
