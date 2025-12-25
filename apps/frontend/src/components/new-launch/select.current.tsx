'use client';

import { FC, RefObject, useEffect, useRef, useState } from 'react';
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
      <div className="select-none left-0 absolute w-full z-[100] px-[20px]">
        <div
          ref={contentRef}
          className={clsx(
            'flex gap-[6px] w-full overflow-x-auto scrollbar scrollbar-thumb-tableBorder scrollbar-track-secondary',
            locked && 'opacity-50 pointer-events-none'
          )}
        >
          <div
            onClick={() => {
              setHide(true);
              setCurrent('global');
            }}
            className={clsx(
              'cursor-pointer flex gap-[8px] rounded-[8px] w-[40px] h-[40px] justify-center items-center bg-newBgLineColor',
              current !== 'global'
                ? 'text-[#A3A3A3]'
                : 'border border-[#FC69FF] text-[#FC69FF]'
            )}
          >
            <div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M2.56267 6.23601L6.13604 8.78837C6.32197 8.92118 6.41494 8.98759 6.51225 9.00289C6.59786 9.01635 6.68554 9.00278 6.76309 8.96407C6.85121 8.92008 6.91976 8.82868 7.05686 8.64588L7.81194 7.63909C7.85071 7.5874 7.8701 7.56155 7.89288 7.53925C7.91311 7.51945 7.93531 7.50177 7.95913 7.48647C7.98595 7.46924 8.01547 7.45612 8.07452 7.42988L11.2983 5.99707C11.432 5.93767 11.4988 5.90798 11.5492 5.8616C11.5938 5.82057 11.6288 5.77033 11.652 5.71436C11.6782 5.65108 11.6831 5.57812 11.6928 5.4322L11.9288 1.8915M11.2493 11.2503L13.4294 12.1846C13.6823 12.293 13.8088 12.3472 13.8757 12.4372C13.9345 12.5162 13.9634 12.6135 13.9573 12.7117C13.9504 12.8237 13.8741 12.9382 13.7214 13.1672L12.6973 14.7035C12.6249 14.812 12.5887 14.8663 12.5409 14.9056C12.4986 14.9403 12.4498 14.9664 12.3974 14.9824C12.3382 15.0003 12.273 15.0003 12.1426 15.0003H10.4799C10.3071 15.0003 10.2207 15.0003 10.1472 14.9714C10.0822 14.9459 10.0248 14.9045 9.98003 14.851C9.92936 14.7904 9.90204 14.7084 9.8474 14.5445L9.25334 12.7623C9.22111 12.6656 9.205 12.6173 9.20076 12.5681C9.19699 12.5246 9.20011 12.4807 9.21 12.4381C9.22114 12.3901 9.24393 12.3445 9.28951 12.2533L9.74077 11.3508C9.83246 11.1674 9.8783 11.0758 9.94891 11.0188C10.0111 10.9687 10.0865 10.9375 10.166 10.9289C10.2561 10.9193 10.3534 10.9517 10.5479 11.0165L11.2493 11.2503ZM18.3327 10.0003C18.3327 14.6027 14.6017 18.3337 9.99935 18.3337C5.39698 18.3337 1.66602 14.6027 1.66602 10.0003C1.66602 5.39795 5.39698 1.66699 9.99935 1.66699C14.6017 1.66699 18.3327 5.39795 18.3327 10.0003Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
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
              className={clsx(
                'border cursor-pointer relative flex gap-[8px] w-[40px] h-[40px] rounded-[8px] items-center bg-newBgLineColor justify-center',
                current === integration.id
                  ? 'border-[#FC69FF] text-[#FC69FF]'
                  : 'border-transparent'
              )}
            >
              <IsGlobal id={integration.id} />
              <div
                className={clsx(
                  'relative w-full h-full rounded-full flex justify-center items-center filter transition-all duration-500'
                )}
              >
                <Image
                  src={integration.picture || '/no-picture.jpg'}
                  className="rounded-full min-w-[26px]"
                  alt={integration.identifier}
                  width={26}
                  height={26}
                />
                {integration.identifier === 'youtube' ? (
                  <img
                    src="/icons/platforms/youtube.svg"
                    className="absolute z-10 bottom-[2px] end-[2px] min-w-[12px]"
                    width={12}
                  />
                ) : (
                  <Image
                    src={`/icons/platforms/${integration.identifier}.png`}
                    className="min-w-[12px] min-h-[12px] rounded-[3px] absolute z-10 bottom-[6px] end-[6px]"
                    alt={integration.identifier}
                    width={12}
                    height={12}
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

export const IsGlobal: FC<{ id: string }> = ({ id }) => {
  const { isInternal } =
    useLaunchStore(
      useShallow((state) => ({
        isInternal: !!state.internal.find(p => p.integration.id === id),
      }))
    );

  if (!isInternal) {
    return null;
  }

  return (
    <div
      data-tooltip-id="tooltip"
      data-tooltip-content="No longer in global mode"
      className="w-[8px] h-[8px] bg-[#FC69FF] -top-[1px] -end-[3px] absolute rounded-full"
    />
  );
};
