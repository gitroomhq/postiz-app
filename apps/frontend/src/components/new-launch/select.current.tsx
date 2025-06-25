'use client';

import { FC } from 'react';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import clsx from 'clsx';
import Image from 'next/image';
import { useShallow } from 'zustand/react/shallow';

export const SelectCurrent: FC = () => {
  const { selectedIntegrations, current, setCurrent } = useLaunchStore(
    useShallow((state) => ({
      selectedIntegrations: state.selectedIntegrations,
      current: state.current,
      setCurrent: state.setCurrent,
    }))
  );

  return (
    <div className="flex gap-[3px]">
      <div
        onClick={() => setCurrent('global')}
        className="cursor-pointer flex gap-[8px] items-center bg-customColor2 p-[10px] rounded-tl-[4px] rounded-tr-[4px]"
      >
        <div
          onClick={() => setCurrent('global')}
          className={clsx(current !== 'global' ? 'opacity-40' : '')}
        >
          T
        </div>
      </div>
      {selectedIntegrations.map(({ integration }) => (
        <div
          onClick={() => setCurrent(integration.id)}
          key={integration.id}
          className="cursor-pointer flex gap-[8px] items-center bg-customColor2 p-[10px] rounded-tl-[4px] rounded-tr-[4px]"
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
  );
};
