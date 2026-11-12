'use client';

import { FC } from 'react';
import clsx from 'clsx';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import { useExistingData } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import { Check } from '@gitroom/frontend/components/launches/tags.component';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import {
  isBrandMark,
  PlatformIcon,
} from '@gitroom/frontend/components/ui/platform.icon.component';

const PlatformBadge: FC<{ integration: Integrations; inactive?: boolean }> = ({
  integration,
  inactive,
}) => {
  return (
    <PlatformIcon
      identifier={integration.identifier}
      size={16}
      inactive={inactive}
      className="absolute z-10 bottom-0 -end-[5px]"
      iconClassName="rounded-[4px] min-w-[16px] min-h-[16px]"
      // a brand mark hangs a little off the corner, to hide less of the picture
      markClassName="-mb-[4px] -me-[4px] bg-newBgColorInner"
    />
  );
};

// a channel row with a checkbox, for the phone sheets
export const IntegrationListRow: FC<{
  integration: Integrations;
  selected: boolean;
  onClick: () => void;
  dimmed?: boolean;
}> = ({ integration, selected, onClick, dimmed }) => {
  // a brand mark can't be dimmed with its row (see isBrandMark)
  const dimParts =
    isBrandMark(integration.identifier) && dimmed && 'opacity-50';
  return (
    <div
      onClick={onClick}
      className={clsx(
        'flex items-center gap-[12px] py-[8px] cursor-pointer select-none',
        !isBrandMark(integration.identifier) && dimmed && 'opacity-50'
      )}
    >
      <div className="relative">
        <ImageWithFallback
          fallbackSrc="/no-picture.jpg"
          src={integration.picture || '/no-picture.jpg'}
          className={clsx('rounded-[8px] min-w-[40px] min-h-[40px]', dimParts)}
          alt={integration.identifier}
          width={40}
          height={40}
        />
        <PlatformBadge integration={integration} inactive={dimmed} />
      </div>
      <div
        className={clsx(
          'flex-1 min-w-0 truncate text-[14px] font-[600]',
          dimParts
        )}
      >
        {integration.name}
      </div>
      <div className={clsx(dimParts)}>
        <Check onChange={() => {}} value={selected} />
      </div>
    </div>
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
      return (
        f.id === exising.integration ||
        !!exising.siblings?.some((sibling) => sibling.integration === f.id)
      );
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
          locked && 'pointer-events-none'
        )}
      >
        {availableIntegrations.map((integration) => (
          <IntegrationListRow
            key={integration.id}
            integration={integration}
            selected={selectedIntegrations.some(
              (p) => p.integration.id === integration.id
            )}
            onClick={toggleIntegration(integration)}
            dimmed={locked}
          />
        ))}
      </div>
    );
  }

  // an unselected channel is grayed out and a locked one faded, as a whole. A
  // brand mark can't be: only its avatar is (see isBrandMark)
  const dimChannel = (integration: Integrations) =>
    clsx(
      selectedIntegrations.findIndex(
        (p) => p.integration.id === integration.id
      ) === -1 && 'grayscale',
      locked && 'opacity-50'
    );

  return (
    <div className={clsx('flex', locked && 'pointer-events-none')}>
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
                      ? 'border-transparent'
                      : 'border-[#622FF6]',
                    !isBrandMark(integration.identifier) &&
                      dimChannel(integration)
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
                        : 'border-[#000]',
                      isBrandMark(integration.identifier) &&
                        dimChannel(integration)
                    )}
                    alt={integration.identifier}
                    width={42}
                    height={42}
                  />
                  <PlatformBadge
                    integration={integration}
                    inactive={!!dimChannel(integration)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
