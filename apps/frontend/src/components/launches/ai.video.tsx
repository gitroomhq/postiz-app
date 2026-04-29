import { Button } from '@gitroom/react/form/button';
import React, { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import Loading from '@gitroom/frontend/components/layout/loading';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import useSWR from 'swr';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { VideoWrapper } from '@gitroom/frontend/components/videos/video.render.component';
import { FormProvider, useForm } from 'react-hook-form';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { VideoContextWrapper } from '@gitroom/frontend/components/videos/video.context.wrapper';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { createPortal } from 'react-dom';

export const Modal: FC<{
  close: () => void;
  value: string;
  type: any;
  setLoading: (loading: boolean) => void;
  onChange: (params: { id: string; path: string }) => void;
}> = (props) => {
  const { type, value, onChange, close, setLoading } = props;
  const fetch = useFetch();
  const setLocked = useLaunchStore((state) => state.setLocked);
  const form = useForm();
  const [position, setPosition] = useState('vertical');
  const toaster = useToaster();

  const loadCredits = useCallback(async () => {
    return (
      await fetch(`/copilot/credits?type=ai_videos`, {
        method: 'GET',
      })
    ).json();
  }, []);

  const { data, mutate } = useSWR('copilot-credits', loadCredits);

  const generate = useCallback(async () => {
    await fetch(`/media/generate-video/${type.identifier}/allowed`);
    setLoading(true);
    close();
    setLocked(true);

    const customParams = form.getValues();
    if (!(await form.trigger())) {
      toaster.show('Please fill all required fields', 'warning');
      return;
    }
    try {
      const image = await fetch(`/media/generate-video`, {
        method: 'POST',
        body: JSON.stringify({
          type: type.identifier,
          output: position,
          customParams,
        }),
      });

      if (image.status == 200 || image.status == 201) {
        onChange(await image.json());
      }
    } catch (e) {}

    setLocked(false);
    setLoading(false);
  }, [type, value, position]);

  return (
    <VideoContextWrapper.Provider value={{ value: value }}>
      <form
        onSubmit={form.handleSubmit(generate)}
        className="flex flex-col gap-[10px]"
      >
        {createPortal(
          <>{data?.credits || 0} credits left</>,
          document.querySelector('.top-title-content') || document.createElement('div')
        )}
        <FormProvider {...form}>
          <div>
            <div className="relative h-[400px]">
              <div className="absolute left-0 top-0 w-full h-full overflow-hidden overflow-y-auto">
                <div className="mt-[10px] flex w-full justify-center items-center gap-[10px]">
                  <div className="flex-1 flex">
                    <Button
                      className="!flex-1"
                      onClick={() => setPosition('vertical')}
                      secondary={position === 'horizontal'}
                    >
                      Vertical (Stories, Reels)
                    </Button>
                  </div>
                  <div className="flex-1 flex mt-[10px]">
                    <Button
                      className="!flex-1"
                      onClick={() => setPosition('horizontal')}
                      secondary={position === 'vertical'}
                    >
                      Horizontal (Normal Post)
                    </Button>
                  </div>
                </div>
                <VideoWrapper identifier={type.identifier} />
              </div>
            </div>
            <div className="flex">
              <Button type="submit" className="flex-1">
                Generate
              </Button>
            </div>
          </div>
        </FormProvider>
      </form>
    </VideoContextWrapper.Provider>
  );
};

export const AiVideo: FC<{
  value: string;
  onChange: (params: { id: string; path: string }) => void;
}> = (props) => {
  const t = useT();
  const { value, onChange } = props;
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<any | null>(null);
  const fetch = useFetch();
  const { isTrailing } = useUser();
  const modals = useModals();

  const loadVideoList = useCallback(async () => {
    return (await (await fetch('/media/video-options')).json()).filter(
      (f: any) => f.placement === 'text-to-image'
    );
  }, []);

  const { isLoading, data } = useSWR('load-videos-ai', loadVideoList, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshWhenHidden: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    keepPreviousData: true,
  });

  const generateVideo = useCallback(
    (type: { identifier: string }) => async () => {
      setType(type);
      modals.openModal({
        title: <div className="top-title-content" />,
        children: (close) => (
          <Modal
            onChange={onChange}
            setLoading={setLoading}
            close={() => {
              close();
              setType(null);
            }}
            type={type}
            value={value}
          />
        ),
      });
    },
    [value, onChange]
  );

  if (isLoading || data?.length === 0) {
    return null;
  }

  return (
    <>
      <div className="relative group">
        <div
          {...(value.length < 30
            ? {
                'data-tooltip-id': 'tooltip',
                'data-tooltip-content':
                  'Please add at least 30 characters to generate AI video',
              }
            : {})}
          className={clsx(
            'cursor-pointer h-[30px] rounded-[6px] justify-center items-center flex bg-newColColor px-[8px]',
            value.length < 30 && 'opacity-50'
          )}
        >
          {loading && (
            <div className="absolute start-[50%] -translate-x-[50%]">
              <Loading height={30} width={30} type="spin" color="#fff" />
            </div>
          )}
          <div
            className={clsx(
              'flex gap-[5px] items-center',
              loading && 'invisible'
            )}
          >
            <div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <g clipPath="url(#clip0_2352_53058)">
                  <path
                    d="M8.06916 14.1663V2.04134M4.97208 14.1663V11.1351M4.97208 5.07259V2.04134M11.1662 14.1663V11.1351M9.09973 2.02152L4.8482 2.04134C3.80748 2.04134 3.28712 2.04134 2.88962 2.23957C2.53997 2.41394 2.25569 2.69218 2.07754 3.0344C1.875 3.42345 1.875 3.93275 1.875 4.95134L1.875 11.2563C1.875 12.2749 1.875 12.7842 2.07754 13.1733C2.25569 13.5155 2.53997 13.7937 2.88962 13.9681C3.28712 14.1663 3.80748 14.1663 4.8482 14.1663H11.2901C12.3308 14.1663 12.8512 14.1663 13.2487 13.9681C13.5984 13.7937 13.8826 13.5155 14.0608 13.1733C14.2633 12.7842 14.2633 12.2749 14.2633 11.2563V7.61426M1.875 5.07259L9.09973 5.06116M1.875 11.1351H14.2633M12.8141 1.20801L12.3949 2.02152C12.253 2.29684 12.1821 2.4345 12.0873 2.55379C12.0032 2.65965 11.9054 2.75455 11.7963 2.83614C11.6734 2.92809 11.5315 2.99692 11.2478 3.13458L10.4094 3.54134L11.2478 3.9481C11.5315 4.08576 11.6734 4.15459 11.7963 4.24654C11.9054 4.32814 12.0032 4.42303 12.0873 4.52889C12.1821 4.64818 12.253 4.78584 12.3949 5.06116L12.8141 5.87467L13.2333 5.06116C13.3751 4.78584 13.4461 4.64818 13.5408 4.52889C13.6249 4.42303 13.7227 4.32814 13.8318 4.24654C13.9548 4.15459 14.0966 4.08576 14.3804 3.9481L15.2188 3.54134L14.3804 3.13458C14.0966 2.99692 13.9548 2.92809 13.8318 2.83614C13.7227 2.75455 13.6249 2.65965 13.5408 2.55379C13.4461 2.4345 13.3751 2.29684 13.2333 2.02152L12.8141 1.20801Z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_2352_53058">
                    <rect width="16" height="16" fill="currentColor" />
                  </clipPath>
                </defs>
              </svg>
            </div>
            <div className="text-[10px] font-[600] iconBreak:hidden block">
              {t('ai', 'AI')} Video
            </div>
          </div>
        </div>
        {value.length >= 30 && !loading && (
          <div className="text-[12px] -mt-[10px] w-[200px] absolute bottom-[100%] z-[500] start-0 hidden group-hover:block">
            <ul className="cursor-pointer rounded-[4px] border border-dashed border-newBgLineColor bg-newColColor mt-[3px] p-[5px]">
              {data.map((p: any) => (
                <li
                  onClick={generateVideo(p)}
                  key={p.identifier}
                  className="hover:bg-sixth"
                >
                  {p.title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
};
