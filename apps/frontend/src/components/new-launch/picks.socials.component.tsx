'use client';

import { FC } from 'react';
import clsx from 'clsx';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import { useExistingData } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';

export const PicksSocialsComponent: FC<{ toolTip?: boolean }> = ({
  toolTip,
}) => {
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

  return (
    <div className={clsx('flex', locked && 'opacity-50 pointer-events-none')}>
      <div className="flex flex-1">
        <div className="innerComponent flex-1 flex">
          <div className="flex flex-wrap gap-[12px] flex-1">
            {integrations
              .filter((f) => {
                if (exising.integration) {
                  return f.id === exising.integration;
                }
                return !f.inBetweenSteps && !f.disabled;
              })
              .map((integration) => {
                const isSelected =
                  selectedIntegrations.findIndex(
                    (p) => p.integration.id === integration.id
                  ) !== -1;
                return (
                <div
                  key={integration.id}
                  className="flex gap-[8px] items-center"
                  {...(toolTip && {
                    'data-tooltip-id': 'tooltip',
                    'data-tooltip-content': integration.name,
                  })}
                >
                  <div
                    onClick={() => {
                      if (exising.integration) {
                        return;
                      }
                      addOrRemoveSelectedIntegration(integration, {});
                    }}
                    className={clsx(
                      'relative flex cursor-pointer items-center justify-center rounded-full border-[2px] bg-pqSettings filter transition-all duration-500',
                      !isSelected
                        ? 'grayscale border-transparent'
                        : 'border-pqBrand'
                    )}
                  >
                    {isSelected && (
                      <span className="absolute -start-[4px] -top-[4px] z-[2] flex h-[16px] w-[16px] items-center justify-center rounded-full bg-pqBrand text-pqOnBrand">
                        <svg
                          viewBox="0 0 24 24"
                          width="10"
                          height="10"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M5 12.5l4.5 4.5L19 7.5"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    )}
                    <ImageWithFallback
                      fallbackSrc="/no-picture.jpg"
                      src={integration.picture || '/no-picture.jpg'}
                      className={clsx(
                        'min-h-[42px] min-w-[42px] rounded-full border-[1.5px] transition-all',
                        !isSelected
                          ? 'border-transparent'
                          : 'border-pqInner'
                      )}
                      alt={integration.identifier}
                      width={42}
                      height={42}
                    />
                    {integration.identifier === 'youtube' ? (
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
                    )}
                  </div>
                </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
