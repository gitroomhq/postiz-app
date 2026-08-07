'use client';

import { FC, RefObject, useCallback, useEffect, useRef, useState } from 'react';
import {
  useLaunchStore,
} from '@gitroom/frontend/components/new-launch/store';
import clsx from 'clsx';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { useShallow } from 'zustand/react/shallow';
import { GlobalIcon } from '@gitroom/frontend/components/ui/icons';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useExistingData } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { useDecisionModal } from '@gitroom/frontend/components/layout/new-modal';
import type { Integrations } from '@gitroom/frontend/components/launches/calendar.context';

export function useHasScroll(ref: RefObject<HTMLElement | null>): boolean {
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
  const {
    selectedIntegrations,
    current,
    setCurrent,
    locked,
    setHide,
    addOrRemoveSelectedIntegration,
    isCreateSet,
  } = useLaunchStore(
    useShallow((state) => ({
      selectedIntegrations: state.selectedIntegrations,
      current: state.current,
      setCurrent: state.setCurrent,
      locked: state.locked,
      setHide: state.setHide,
      addOrRemoveSelectedIntegration: state.addOrRemoveSelectedIntegration,
      isCreateSet: state.isCreateSet,
    }))
  );

  const contentRef = useRef<HTMLDivElement>(null);
  const hasScroll = useHasScroll(contentRef);
  const existingData = useExistingData();
  const decisionModal = useDecisionModal();
  const canRemove = !existingData?.integration && !isCreateSet;

  const t = useT();
  const isGlobal = current === 'global';
  const showHint = selectedIntegrations.length > 0;
  const currentChannel = selectedIntegrations.find(
    (p) => p.integration.id === current
  )?.integration;

  const removeChannel = useCallback(
    async (integration: Integrations) => {
      if (!canRemove) {
        return;
      }
      const open = await decisionModal.open({
        title: t('remove_social_account', 'Remove Social Account'),
        description: t(
          'are_you_sure_remove_social_from_scheduling',
          'Are you sure you want to remove this social from scheduling?'
        ),
      });
      if (!open) {
        return;
      }
      addOrRemoveSelectedIntegration(integration, {});
      if (current === integration.id) {
        setCurrent('global');
      }
    },
    [
      canRemove,
      decisionModal,
      t,
      addOrRemoveSelectedIntegration,
      current,
      setCurrent,
    ]
  );

  return (
    <>
      <div className="select-none left-0 absolute w-full z-[100] px-[20px]">
        {showHint && (
          <div className="mb-[8px] flex items-center gap-[6px] text-[11.5px] font-[500] text-pqMuted">
            {isGlobal ? (
              <>
                <span>
                  {t(
                    'you_are_in_global_editing_mode',
                    'You are in global editing mode'
                  )}
                </span>
                <span className="text-pqSoft" aria-hidden="true">
                  ·
                </span>
                <span className="inline-flex items-center gap-[4px] text-pqSoft">
                  {t(
                    'click_channel_to_customize',
                    'Click a channel to customize'
                  )}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    className="opacity-80"
                  >
                    <path
                      d="M6 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </>
            ) : (
              <span>
                {t('customize_for_channel', 'Customize · {{name}}', {
                  name: currentChannel?.name || 'Channel',
                })}
              </span>
            )}
          </div>
        )}
        <div
          ref={contentRef}
          className={clsx(
            'flex w-full gap-[12px] overflow-x-auto ps-[6px] pe-[6px] pt-[6px] pb-[6px] -ms-[6px] -me-[6px] scrollbar scrollbar-thumb-tableBorder scrollbar-track-secondary',
            locked && 'pointer-events-none opacity-50'
          )}
        >
          <div
            onClick={() => {
              setHide(true);
              setCurrent('global');
            }}
            data-tooltip-id="tooltip"
            data-tooltip-content={t(
              'global_editing_tooltip',
              'Global — same post for all channels'
            )}
            className={clsx(
              'flex h-[44px] w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-pqTableHeader text-pqPink transition-all',
              !isGlobal
                ? 'shadow-[inset_0_0_0_1.5px_transparent]'
                : 'shadow-[inset_0_0_0_1.5px_var(--pink)]'
            )}
          >
            <GlobalIcon />
          </div>
          {selectedIntegrations.map(({ integration }) => {
            const isActive = current === integration.id;
            return (
              <div
                onClick={() => {
                  setHide(true);
                  setCurrent(integration.id);
                }}
                key={integration.id}
                data-tooltip-id="tooltip"
                data-tooltip-content={
                  isGlobal
                    ? t('customize_for_channel', 'Customize · {{name}}', {
                        name: integration.name,
                      })
                    : integration.name
                }
                className={clsx(
                  'group relative flex h-[44px] w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-pqSettings transition-all duration-500',
                  isActive
                    ? 'shadow-[inset_0_0_0_1.5px_var(--brand)]'
                    : 'shadow-[inset_0_0_0_1.5px_transparent]'
                )}
              >
                <IsGlobal id={integration.id} />
                {canRemove && (
                  <button
                    type="button"
                    aria-label={t('remove_channel', 'Remove channel')}
                    data-tooltip-id="tooltip"
                    data-tooltip-content={t('remove_channel', 'Remove channel')}
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeChannel(integration);
                    }}
                    className="absolute -end-[5px] -top-[5px] z-[3] grid h-[18px] w-[18px] place-items-center rounded-full bg-pqPop text-pqMuted shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-pqDanger hover:text-white hover:shadow-none"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="10"
                      height="10"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M6 6l12 12M18 6 6 18"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                )}
                <div
                  className={clsx(
                    'relative flex h-full w-full items-center justify-center overflow-hidden rounded-[9px] transition-all',
                    !isActive && 'grayscale opacity-70 group-hover:opacity-100'
                  )}
                >
                  <SafeImage
                    src={integration.picture || '/no-picture.jpg'}
                    className="min-h-[40px] min-w-[40px] rounded-[8px]"
                    alt={integration.identifier}
                    width={40}
                    height={40}
                    onError={(e) => {
                      e.currentTarget.src = '/no-picture.jpg';
                      e.currentTarget.srcset = '/no-picture.jpg';
                    }}
                  />
                  {integration.identifier === 'youtube' ? (
                    <img
                      src="/icons/platforms/youtube.svg"
                      className="absolute bottom-[2px] end-[2px] z-10 min-w-[14px]"
                      width={14}
                      alt=""
                    />
                  ) : (
                    <SafeImage
                      src={`/icons/platforms/${integration.identifier}.png`}
                      className="absolute bottom-[2px] end-[2px] z-10 min-h-[14px] min-w-[14px] rounded-[3px]"
                      alt={integration.identifier}
                      width={14}
                      height={14}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div
        className={clsx(
          hasScroll
            ? showHint
              ? 'h-[86px]'
              : 'h-[62px]'
            : showHint
            ? 'h-[78px]'
            : 'h-[54px]'
        )}
      />
    </>
  );
};

export const IsGlobal: FC<{ id: string }> = ({ id }) => {
  const t = useT();
  const { isInternal } = useLaunchStore(
    useShallow((state) => ({
      isInternal: !!state.internal.find((p) => p.integration.id === id),
    }))
  );

  if (!isInternal) {
    return null;
  }

  return (
    <div
      data-tooltip-id="tooltip"
      data-tooltip-content={t(
        'no_longer_global_mode',
        'No longer in global mode'
      )}
      className="absolute -start-[2px] -bottom-[2px] z-[2] h-[9px] w-[9px] rounded-full bg-pqBrand shadow-[0_0_0_2px_var(--bg)]"
      aria-hidden="true"
    />
  );
};
