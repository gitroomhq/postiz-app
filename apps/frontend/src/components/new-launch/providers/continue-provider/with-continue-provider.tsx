'use client';

import { FC, ReactNode, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';

const SWR_OPTIONS = {
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  revalidateOnFocus: false,
  revalidateIfStale: false,
  revalidateOnMount: true,
  revalidateOnReconnect: false,
  refreshInterval: 0,
};

export interface ContinueProviderProps {
  onSave: (data: any) => Promise<void>;
  existingId: string[];
  initialData?: any[];
  isSaving?: boolean;
  // Shows a "Back to Postiz" button in the empty state — used by the
  // full-page OAuth landing flow, which has no dialog to close
  onBack?: () => void;
}

export interface EmptyStateMessage {
  key: string;
  text: string;
}

export interface DisabledItemMessage {
  caption: EmptyStateMessage;
  tooltip: EmptyStateMessage;
}

export interface ContinueProviderConfig<TItem, TSelection> {
  endpoint: string;
  swrKey: string;
  titleKey: string;
  titleDefault: string;
  emptyStateMessages: EmptyStateMessage[];
  // Returns why an item can't be selected (rendered muted with a caption
  // and an info tooltip), or undefined when it is selectable
  getDisabledMessage?: (item: TItem) => DisabledItemMessage | undefined;
  getSelectionValue: (item: TItem) => TSelection;
  transformSaveData: (selection: TSelection) => any;
  renderItem: (item: TItem, isSelected: boolean) => ReactNode;
  isSelected: (item: TItem, selection: TSelection | null) => boolean;
  getItemId: (item: TItem) => string;
}

export function withContinueProvider<TItem, TSelection>(
  config: ContinueProviderConfig<TItem, TSelection>
): FC<ContinueProviderProps> {
  const {
    endpoint,
    swrKey,
    titleKey,
    titleDefault,
    emptyStateMessages,
    getDisabledMessage,
    getSelectionValue,
    transformSaveData,
    renderItem,
    isSelected,
    getItemId,
  } = config;

  return function ContinueProviderComponent(props: ContinueProviderProps) {
    const { onSave, existingId, initialData, isSaving, onBack } = props;
    const call = useCustomProviderFunction();
    const t = useT();
    const [selection, setSelection] = useState<TSelection | null>(null);

    const loadData = useCallback(async () => {
      // Skip fetch if initial data was provided
      if (initialData) {
        return initialData;
      }
      try {
        return await call.get(endpoint);
      } catch (e) {
        // Handle error silently
      }
    }, [initialData]);

    const { data, isLoading } = useSWR(
      initialData ? null : swrKey,
      loadData,
      SWR_OPTIONS
    );

    const resolvedData = initialData || data;

    const handleSelect = useCallback(
      (item: TItem) => () => {
        setSelection(getSelectionValue(item));
      },
      []
    );

    const handleSave = useCallback(async () => {
      if (selection) {
        await onSave(transformSaveData(selection));
      }
    }, [onSave, selection]);

    const filteredData = useMemo(() => {
      return (
        (resolvedData as TItem[])?.filter(
          (item) => !existingId.includes(getItemId(item))
        ) || []
      );
    }, [resolvedData, existingId]);

    const hasDisabled = useMemo(
      () => filteredData.some((item) => !!getDisabledMessage?.(item)),
      [filteredData]
    );

    if (!isLoading && !resolvedData?.length) {
      return (
        <div className="text-center flex flex-col justify-center items-center text-[18px] leading-[26px] h-[300px]">
          {emptyStateMessages.map((msg, index) => (
            <span key={msg.key}>
              {t(msg.key, msg.text)}
              {index < emptyStateMessages.length - 1 && (
                <>
                  <br />
                  <br />
                </>
              )}
            </span>
          ))}
          {!!onBack && (
            <div className="mt-[24px]">
              <Button type="button" onClick={onBack}>
                {t('back_to_postiz', 'Back to Postiz')}
              </Button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-[20px]">
        <div>{t(titleKey, titleDefault)}</div>
        <div className="grid grid-cols-3 justify-items-center select-none cursor-pointer gap-[10px]">
          {filteredData.map((item) => {
            const disabled = getDisabledMessage?.(item);
            return (
              <div
                key={getItemId(item)}
                className={clsx(
                  'flex flex-col w-full text-center gap-[10px] border border-input p-[10px] rounded-[8px]',
                  disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-seventh',
                  isSelected(item, selection) && 'bg-seventh border-primary'
                )}
                onClick={disabled ? undefined : handleSelect(item)}
              >
                {renderItem(item, isSelected(item, selection))}
                {!!disabled && (
                  <div className="flex items-center justify-center gap-[6px] text-[12px]">
                    <span>
                      {t(disabled.caption.key, disabled.caption.text)}
                    </span>
                    <button
                      type="button"
                      className="cursor-pointer"
                      data-tooltip-id="tooltip"
                      data-tooltip-content={t(
                        disabled.tooltip.key,
                        disabled.tooltip.text
                      )}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-[10px]">
          <Button disabled={!selection || isSaving} loading={isSaving} onClick={handleSave}>
            {t('save', 'Save')}
          </Button>
          {!!onBack && hasDisabled && (
            <Button type="button" secondary={true} onClick={onBack}>
              {t('back_to_postiz', 'Back to Postiz')}
            </Button>
          )}
        </div>
      </div>
    );
  };
}
