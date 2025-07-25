'use client';

import {
  FC,
  RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import clsx from 'clsx';
import Image from 'next/image';
import { useShallow } from 'zustand/react/shallow';

export function useHasScroll(ref: RefObject<HTMLElement>): boolean {
  const [hasHorizontalScroll, setHasHorizontalScroll] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const checkScroll = () => {
      const el = ref.current;
      if (el) {
        setHasHorizontalScroll(el.scrollWidth > el.clientWidth);
      }
    };

    checkScroll(); // initial check

    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(ref.current);

    const mutationObserver = new MutationObserver(checkScroll);
    mutationObserver.observe(ref.current, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [ref]);

  return hasHorizontalScroll;
}

export const SelectCurrent: FC = () => {
  const { selectedIntegrations, current, setCurrent, locked, setHide, hide } =
    useLaunchStore(
      useShallow((state) => ({
        selectedIntegrations: state.selectedIntegrations,
        current: state.current,
        setCurrent: state.setCurrent,
        locked: state.locked,
        hide: state.hide,
        setHide: state.setHide,
      }))
    );

  const contentRef = useRef<HTMLDivElement>(null);
  const hasScroll = useHasScroll(contentRef);

  useEffect(() => {
    if (!hide) {
      return;
    }

    setHide(false);
  }, [hide]);

  return (
    <>
      <div className="left-0 absolute w-full z-[100] px-[24px]">
        <div
          ref={contentRef}
          className={clsx(
            'flex gap-[3px] w-full overflow-x-auto scrollbar scrollbar-thumb-tableBorder scrollbar-track-secondary',
            locked && 'opacity-50 pointer-events-none'
          )}
        >
          <div
            onClick={() => {
              setHide(true);
              setCurrent('global');
            }}
            className="cursor-pointer flex gap-[8px] items-center bg-newBgLineColor p-[10px] rounded-tl-[4px] rounded-tr-[4px]"
          >
            <div className={clsx(current !== 'global' ? 'opacity-40' : '')}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16 3C13.4288 3 10.9154 3.76244 8.77759 5.1909C6.63975 6.61935 4.97351 8.64968 3.98957 11.0251C3.00563 13.4006 2.74819 16.0144 3.2498 18.5362C3.75141 21.0579 4.98953 23.3743 6.80762 25.1924C8.6257 27.0105 10.9421 28.2486 13.4638 28.7502C15.9856 29.2518 18.5995 28.9944 20.9749 28.0104C23.3503 27.0265 25.3807 25.3603 26.8091 23.2224C28.2376 21.0846 29 18.5712 29 16C28.9964 12.5533 27.6256 9.24882 25.1884 6.81163C22.7512 4.37445 19.4467 3.00364 16 3ZM12.7038 21H19.2963C18.625 23.2925 17.5 25.3587 16 26.9862C14.5 25.3587 13.375 23.2925 12.7038 21ZM12.25 19C11.9183 17.0138 11.9183 14.9862 12.25 13H19.75C20.0817 14.9862 20.0817 17.0138 19.75 19H12.25ZM5.00001 16C4.99914 14.9855 5.13923 13.9759 5.41626 13H10.2238C9.92542 14.9889 9.92542 17.0111 10.2238 19H5.41626C5.13923 18.0241 4.99914 17.0145 5.00001 16ZM19.2963 11H12.7038C13.375 8.7075 14.5 6.64125 16 5.01375C17.5 6.64125 18.625 8.7075 19.2963 11ZM21.7763 13H26.5838C27.1388 14.9615 27.1388 17.0385 26.5838 19H21.7763C22.0746 17.0111 22.0746 14.9889 21.7763 13ZM25.7963 11H21.3675C20.8572 8.99189 20.0001 7.0883 18.835 5.375C20.3236 5.77503 21.7119 6.48215 22.9108 7.45091C24.1097 8.41967 25.0926 9.62861 25.7963 11ZM13.165 5.375C11.9999 7.0883 11.1428 8.99189 10.6325 11H6.20376C6.90741 9.62861 7.89029 8.41967 9.08918 7.45091C10.2881 6.48215 11.6764 5.77503 13.165 5.375ZM6.20376 21H10.6325C11.1428 23.0081 11.9999 24.9117 13.165 26.625C11.6764 26.225 10.2881 25.5178 9.08918 24.5491C7.89029 23.5803 6.90741 22.3714 6.20376 21ZM18.835 26.625C20.0001 24.9117 20.8572 23.0081 21.3675 21H25.7963C25.0926 22.3714 24.1097 23.5803 22.9108 24.5491C21.7119 25.5178 20.3236 26.225 18.835 26.625Z"
                  fill="currentColor"
                />
              </svg>
            </div>
          </div>
          {selectedIntegrations.map(({ integration }) => (
            <div
              onClick={() => {
                setHide(true);
                setCurrent(integration.id);
              }}
              key={integration.id}
              className="cursor-pointer flex gap-[8px] items-center bg-newBgLineColor p-[10px] rounded-tl-[4px] rounded-tr-[4px]"
            >
              <div
                className={clsx(
                  'relative w-[20px] h-[20px] rounded-full flex justify-center items-center bg-fifth filter transition-all duration-500',
                  current !== integration.id ? 'opacity-40' : ''
                )}
              >
                <Image
                  src={integration.picture || '/no-picture.jpg'}
                  className="rounded-full"
                  alt={integration.identifier}
                  width={20}
                  height={20}
                />
                {integration.identifier === 'youtube' ? (
                  <img
                    src="/icons/platforms/youtube.svg"
                    className="absolute z-10 -bottom-[5px] -end-[5px]"
                    width={20}
                  />
                ) : (
                  <Image
                    src={`/icons/platforms/${integration.identifier}.png`}
                    className="rounded-full absolute z-10 -bottom-[5px] -end-[5px] border border-fifth"
                    alt={integration.identifier}
                    width={15}
                    height={15}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={clsx(hasScroll ? 'h-[55px]' : 'h-[40px]')} />
    </>
  );
};
