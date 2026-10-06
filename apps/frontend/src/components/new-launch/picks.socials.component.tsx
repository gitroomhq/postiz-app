'use client';

import { FC } from 'react';
import clsx from 'clsx';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import { useExistingData } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import { Check } from '@gitroom/frontend/components/launches/tags.component';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';

const PlatformBadge: FC<{ integration: Integrations }> = ({ integration }) => {
  return integration.identifier === 'youtube' ? (
    <img
      src="/icons/platforms/youtube.svg"
      className="absolute z-10 bottom-0 -end-[5px] min-w-[16px]"
      width={16}
    />
  ) : (
    <SafeImage
      src={`/icons/platforms/${integration.identifier}.png`}
      className="rounded-[4px] absolute z-10 bottom-0 -end-[5px] min-w-[16px] min-h-[16px]"
      alt={integration.identifier}
      width={16}
      height={16}
    />
  );
};

export const PicksSocialsComponent: FC<{
  toolTip?: boolean;
  list?: boolean;
}> = ({ toolTip, list }) => {
  const exising = useExistingData();

  const {
    locked,
    addOrRemoveSelectedIntegration,
    integrations,
    selectedIntegrations,
  } = useLaunchStore(
    useShallow((state) => ({
      integrations: state.integrations,
      selectedIntegrations: state.selectedIntegrations,
      addOrRemoveSelectedIntegration: state.addOrRemoveSelectedIntegration,
      locked: state.locked,
    }))
  );

  const availableIntegrations = integrations.filter((f) => {
    if (exising.integration) {
      return f.id === exising.integration;
    }
    return !f.inBetweenSteps && !f.disabled;
  });

  const toggleIntegration = (integration: Integrations) => () => {
    if (exising.integration) {
      return;
    }
    addOrRemoveSelectedIntegration(integration, {});
  };

  if (list) {
    return (
      <div
        className={clsx(
          'flex flex-col gap-[4px]',
          locked && 'opacity-50 pointer-events-none'
        )}
      >
        {availableIntegrations.map((integration) => {
          const selected = selectedIntegrations.some(
            (p) => p.integration.id === integration.id
          );

          return (
            <div
              key={integration.id}
              onClick={toggleIntegration(integration)}
              className="flex items-center gap-[12px] py-[8px] cursor-pointer select-none"
            >
              <div className="relative">
                <ImageWithFallback
                  fallbackSrc="/no-picture.jpg"
                  src={integration.picture || '/no-picture.jpg'}
                  className="rounded-[8px] min-w-[40px] min-h-[40px]"
                  alt={integration.identifier}
                  width={40}
                  height={40}
                />
                <PlatformBadge integration={integration} />
              </div>
              <div className="flex-1 min-w-0 truncate text-[14px] font-[600]">
                {integration.name}
              </div>
              <Check onChange={() => {}} value={selected} />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={clsx('flex', locked && 'opacity-50 pointer-events-none')}>
      <div className="flex flex-1">
        <div className="innerComponent flex-1 flex">
          <div className="flex flex-wrap gap-[12px] flex-1">
            {availableIntegrations.map((integration) => (
              <div
                key={integration.id}
                className="flex gap-[8px] items-center"
                {...(toolTip && {
                  'data-tooltip-id': 'tooltip',
                  'data-tooltip-content': integration.name,
                })}
              >
                <div
                  onClick={toggleIntegration(integration)}
                  className={clsx(
                    'cursor-pointer border-[2px] relative rounded-full flex justify-center items-center bg-fifth filter transition-all duration-500',
                    selectedIntegrations.findIndex(
                      (p) => p.integration.id === integration.id
                    ) === -1
                      ? 'grayscale border-transparent'
                      : 'border-[#622FF6]'
                  )}
                >
                  <ImageWithFallback
                    fallbackSrc="/no-picture.jpg"
                    src={integration.picture || '/no-picture.jpg'}
                    className={clsx(
                      'rounded-full transition-all min-w-[42px] border-[1.5px] min-h-[42px]',
                      selectedIntegrations.findIndex(
                        (p) => p.integration.id === integration.id
                      ) === -1
                        ? 'border-transparent'
                        : 'border-[#000]'
                    )}
                    alt={integration.identifier}
                    width={42}
                    height={42}
                  />
                  <PlatformBadge integration={integration} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
