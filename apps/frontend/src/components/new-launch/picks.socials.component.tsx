'use client';

import { FC } from 'react';
import clsx from 'clsx';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import { useExistingData } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { ChannelAvatar } from '@gitroom/frontend/components/new-launch/channel.avatar';
import { channelNameWithHandle } from '@gitroom/frontend/components/channels/channel-handle';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const PicksSocialsComponent: FC<{ toolTip?: boolean }> = ({
  toolTip,
}) => {
  const exising = useExistingData();
  const t = useT();

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

  // The composer's own gate counts the RAW list, but this row hides disabled
  // and half-connected channels. Downgrading to FREE (`channel: 0`) disables
  // every channel at once, so the account passes that gate and lands here with
  // nothing to tick and no explanation. Say what happened instead.
  const pickable = integrations.filter((f) => {
    if (exising.integration) {
      return f.id === exising.integration;
    }
    // Already selected stays on screen even if it is no longer healthy. Sets
    // and the calendar's preselection seed selectedIntegrations without any
    // health filter, so hiding the avatar left the channel selected, tabbed and
    // scheduled with no way to remove it.
    // `{ integration, settings }`, not a bare integration — the isSelected
    // check further down reads the same shape.
    if (selectedIntegrations.some((s: any) => s.integration?.id === f.id)) {
      return true;
    }
    // refreshNeeded belongs here too: a disconnected channel was freely
    // selectable with no warning, the post went to QUEUE, and it only failed
    // at publish time. Every other picker in the product (autopost, webhooks,
    // agents, chat tools) already filters it, and Channels blocks New post on
    // it.
    return !f.inBetweenSteps && !f.disabled && !f.refreshNeeded;
  });

  if (!pickable.length) {
    return (
      <div className="flex flex-1 rounded-[8px] bg-pqInner px-[14px] py-[12px] text-[13px] leading-[1.5] text-pqMuted">
        {t(
          'no_pickable_channels',
          'None of your channels can be posted to right now. They are disconnected, disabled, or still finishing setup. Check Channels, or your plan, to continue.'
        )}
      </div>
    );
  }

  return (
    <div className={clsx('flex', locked && 'opacity-50 pointer-events-none')}>
      <div className="flex flex-1">
        <div className="innerComponent flex-1 flex">
          <div className="flex flex-wrap gap-[12px] flex-1">
            {pickable
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
                    'data-tooltip-content': channelNameWithHandle(integration),
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
                    <ChannelAvatar
                      integration={integration}
                      size={42}
                      rounded="full"
                      badgeSize={16}
                      className={clsx(
                        'min-h-[42px] min-w-[42px] border-[1.5px] transition-all',
                        !isSelected
                          ? 'border-transparent'
                          : 'border-pqInner'
                      )}
                    />
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
