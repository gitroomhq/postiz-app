'use client';

import { FC } from 'react';
import clsx from 'clsx';
import Image from 'next/image';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';

export const PicksSocialsComponent: FC<{ toolTip?: boolean }> = ({
  toolTip,
}) => {
  const { addOrRemoveSelectedIntegration, integrations, selectedIntegrations } =
    useLaunchStore(
      useShallow((state) => ({
        integrations: state.integrations,
        selectedIntegrations: state.selectedIntegrations,
        addOrRemoveSelectedIntegration: state.addOrRemoveSelectedIntegration,
      }))
    );
  return (
    <div className={clsx('flex')}>
      <div className="flex">
        <div className="innerComponent">
          <div className="flex">
            {integrations
              .filter((f) => !f.inBetweenSteps)
              .map((integration) => (
                <div
                  key={integration.id}
                  className="flex gap-[8px] items-center me-[10px]"
                  {...(toolTip && {
                    'data-tooltip-id': 'tooltip',
                    'data-tooltip-content': integration.name,
                  })}
                >
                  <div
                    onClick={() =>
                      addOrRemoveSelectedIntegration(integration, {})
                    }
                    className={clsx(
                      'cursor-pointer relative w-[34px] h-[34px] rounded-full flex justify-center items-center bg-fifth filter transition-all duration-500',
                      selectedIntegrations.findIndex(
                        (p) => p.integration.id === integration.id
                      ) === -1
                        ? 'opacity-40'
                        : ''
                    )}
                  >
                    <Image
                      src={integration.picture || '/no-picture.jpg'}
                      className="rounded-full"
                      alt={integration.identifier}
                      width={32}
                      height={32}
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
                        width={20}
                        height={20}
                      />
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
