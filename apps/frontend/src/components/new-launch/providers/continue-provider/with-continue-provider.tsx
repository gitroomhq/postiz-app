'use client';

import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import {
  continuePickerDensity,
  filterContinuePickerItems,
} from './continue-picker.density';
import {
  asContinueSelectionList,
  itemIsContinueSelected,
  toggleContinueSelection,
} from './continue-picker-selection';

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
}

export interface EmptyStateMessage {
  key: string;
  text: string;
}

export interface ContinueProviderConfig<TItem, TSelection> {
  endpoint: string;
  swrKey: string;
  titleKey: string;
  titleDefault: string;
  emptyStateMessages: EmptyStateMessage[];
  getSelectionValue: (item: TItem) => TSelection;
  transformSaveData: (selection: TSelection | TSelection[]) => any;
  renderItem: (item: TItem, isSelected: boolean) => ReactNode;
  isSelected: (item: TItem, selection: TSelection | null) => boolean;
  getItemId: (item: TItem) => string;
}

function SelectedMark({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        'grid place-items-center rounded-full bg-pqBrand text-pqOnBrand',
        className
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

const gridAvatarClass =
  '[&_img]:mx-auto [&_img]:!size-[56px] [&_img]:!max-w-none [&_img]:!rounded-[12px] [&_img]:object-cover';
const gridAvatarBoxClass =
  '[&_[data-avatar]]:!size-[56px] [&_[data-avatar]]:!overflow-hidden [&_[data-avatar]]:!rounded-[12px]';
const listAvatarClass =
  '[&_img]:!size-[40px] [&_img]:!max-w-none [&_img]:!shrink-0 [&_img]:!rounded-[12px] [&_img]:object-cover';
const listAvatarBoxClass =
  '[&_[data-avatar]]:!size-[40px] [&_[data-avatar]]:!overflow-hidden [&_[data-avatar]]:!rounded-[12px] [&>span]:min-w-0 [&>span]:flex-1';
const confirmAvatarClass =
  '[&_img]:mx-auto [&_img]:!size-[88px] [&_img]:!max-w-none [&_img]:!rounded-[12px] [&_img]:object-cover';
const confirmAvatarBoxClass =
  '[&_[data-avatar]]:!size-[88px] [&_[data-avatar]]:!overflow-hidden [&_[data-avatar]]:!rounded-[12px]';

export function withContinueProvider<TItem, TSelection>(
  config: ContinueProviderConfig<TItem, TSelection>
): FC<ContinueProviderProps> {
  const {
    endpoint,
    swrKey,
    titleKey,
    titleDefault,
    emptyStateMessages,
    getSelectionValue,
    transformSaveData,
    renderItem,
    isSelected,
    getItemId,
  } = config;

  return function ContinueProviderComponent(props: ContinueProviderProps) {
    const { onSave, existingId, initialData, isSaving } = props;
    const call = useCustomProviderFunction();
    const t = useT();
    const [selection, setSelection] = useState<TSelection | TSelection[] | null>(
      null
    );
    const [search, setSearch] = useState('');

    const loadData = useCallback(async () => {
      // Skip fetch if initial data was provided
      if (initialData) {
        return initialData;
      }
      // Deliberately not caught. Swallowing the error resolved the fetcher to
      // `undefined`, which SWR reports as a *successful* empty result — so a
      // provider that failed to load its options looked exactly like a provider
      // with no options to offer, and `isLoading` went false either way. Letting
      // it throw is what gives SWR an `error` to distinguish the two, the same
      // rule CLAUDE.md sets out under "Loading and empty states".
      return await call.get(endpoint);
    }, [initialData]);

    const { data, isLoading, error, mutate } = useSWR(
      initialData ? null : swrKey,
      loadData,
      SWR_OPTIONS
    );

    const resolvedData = initialData || data;

    const filteredData = useMemo(() => {
      return (
        (resolvedData as TItem[])?.filter(
          (item) => !existingId.includes(getItemId(item))
        ) || []
      );
    }, [resolvedData, existingId]);

    const density = continuePickerDensity(filteredData.length);
    const multi = density !== 'confirm';

    const visibleData = useMemo(() => {
      if (density !== 'list') {
        return filteredData;
      }
      return filterContinuePickerItems(filteredData, search);
    }, [density, filteredData, search]);

    const chosen = asContinueSelectionList(selection);

    // One channel and a disabled Save looks like a selected card that does
    // nothing. Pre-select the only option so Save is actually armed.
    useEffect(() => {
      if (selection || filteredData.length !== 1) {
        return;
      }
      setSelection(getSelectionValue(filteredData[0]));
    }, [filteredData, selection]);

    const handleSelect = useCallback(
      (item: TItem) => () => {
        if (multi) {
          setSelection((current) =>
            toggleContinueSelection(current, item, getSelectionValue, isSelected)
          );
          return;
        }
        setSelection(getSelectionValue(item));
      },
      [multi]
    );

    const handleToggleAll = useCallback(() => {
      if (
        filteredData.length > 0 &&
        filteredData.every((item) =>
          itemIsContinueSelected(item, selection, isSelected)
        )
      ) {
        setSelection([]);
        return;
      }
      setSelection(filteredData.map((item) => getSelectionValue(item)));
    }, [filteredData, selection]);

    const handleSave = useCallback(async () => {
      const picked =
        chosen.length > 0
          ? chosen
          : filteredData.length === 1
            ? [getSelectionValue(filteredData[0])]
            : [];
      if (!picked.length) {
        return;
      }
      await onSave(
        transformSaveData(picked.length === 1 ? picked[0] : picked)
      );
    }, [onSave, chosen, filteredData]);

    const saveEnabled =
      !isSaving && (chosen.length > 0 || filteredData.length === 1);
    const allVisibleSelected =
      filteredData.length > 1 &&
      filteredData.every((item) =>
        itemIsContinueSelected(item, selection, isSelected)
      );

    // A failed load is not an empty account. Both used to render the same
    // "nothing here" copy, which told someone whose options exist that they
    // have none — and offered no way to find out otherwise.
    if (!isLoading && error) {
      return (
        <div className="flex h-[240px] flex-col items-center justify-center gap-[12px] text-center text-[15px] leading-[24px] text-pqMuted">
          <span>
            {t(
              'provider_options_failed',
              'We could not load the options for this channel.'
            )}
          </span>
          <button
            type="button"
            onClick={() => mutate()}
            className="cursor-pointer text-[13.5px] font-[600] text-pqFocused underline hover:no-underline"
          >
            {t('try_again', 'Try again')}
          </button>
        </div>
      );
    }

    if (!isLoading && !resolvedData?.length) {
      return (
        <div className="flex h-[240px] flex-col items-center justify-center text-center text-[15px] leading-[24px] text-pqMuted">
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
        </div>
      );
    }

    const saveButton = (
      <Button
        disabled={!saveEnabled}
        loading={isSaving}
        onClick={handleSave}
        size={density === 'confirm' ? 'lg' : 'md'}
        className={density === 'confirm' ? 'w-full max-w-[320px]' : undefined}
      >
        {density === 'confirm'
          ? t('connect_this_channel', 'Connect this channel')
          : t('save', 'Save')}
      </Button>
    );

    return (
      <div
        className="flex flex-col gap-[16px]"
        data-pq="continue-picker"
        data-pq-density={density}
        data-pq-multi={multi ? 'true' : 'false'}
      >
        <div className="flex items-end justify-between gap-[12px]">
          <div className="text-[12px] font-[600] uppercase tracking-[0.06em] text-pqMuted">
            {density === 'confirm'
              ? t('confirm_channel', 'Confirm channel')
              : t(titleKey, titleDefault)}
          </div>
          {density !== 'confirm' && (
            <div className="flex items-center gap-[10px] text-[11.5px] text-pqSoft">
              {chosen.length > 0 && (
                <span>
                  {t('n_selected', '{{count}} selected', {
                    count: chosen.length,
                  })}
                </span>
              )}
              <span>
                {t('n_channels', '{count} channels').replace(
                  '{count}',
                  String(filteredData.length)
                )}
              </span>
            </div>
          )}
        </div>

        {density === 'confirm' && filteredData[0] && (
          <div className="flex flex-col items-center gap-[18px] rounded-pqLg bg-pqPop px-[24px] py-[28px] text-center shadow-[inset_0_0_0_1px_var(--border)]">
            <span className="rounded-full bg-pqBrandSoft px-[10px] py-[3px] text-[11.5px] font-[600] text-pqFocused">
              {t('ready_to_connect', 'Ready to connect')}
            </span>
            <div
              className={clsx(
                'flex flex-col items-center gap-[12px]',
                confirmAvatarClass,
                confirmAvatarBoxClass
              )}
            >
              {renderItem(filteredData[0], true)}
            </div>
            <p className="max-w-[380px] text-pretty text-[13.5px] leading-[20px] text-pqMuted">
              {t(
                'only_option_to_connect',
                'This is the only option on this account. Confirm to connect.'
              )}
            </p>
            {saveButton}
          </div>
        )}

        {density === 'grid' && (
          <>
            <div
              role="group"
              aria-label={t(titleKey, titleDefault)}
              className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-[10px]"
            >
              {visibleData.map((item) => {
                const selected = itemIsContinueSelected(
                  item,
                  selection,
                  isSelected
                );
                return (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    key={getItemId(item)}
                    className={clsx(
                      'relative flex min-h-[156px] cursor-pointer flex-col items-center justify-center gap-[10px] rounded-pqMd px-[14px] py-[18px] text-center transition-colors',
                      gridAvatarClass,
                      gridAvatarBoxClass,
                      selected
                        ? 'bg-pqNavActive shadow-[inset_0_0_0_1.5px_var(--brand)]'
                        : 'shadow-[inset_0_0_0_1px_var(--border)] hover:bg-pqHover'
                    )}
                    onClick={handleSelect(item)}
                  >
                    {selected && (
                      <SelectedMark className="absolute end-[10px] top-[10px] size-[22px]" />
                    )}
                    {renderItem(item, selected)}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-[12px]">
              <button
                type="button"
                onClick={handleToggleAll}
                className="cursor-pointer text-[13.5px] font-[600] text-pqFocused hover:underline"
              >
                {allVisibleSelected
                  ? t('clear', 'Clear')
                  : t('select_all', 'Select all')}
              </button>
              {saveButton}
            </div>
          </>
        )}

        {density === 'list' && (
          <>
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="none"
                aria-hidden="true"
                className="pointer-events-none absolute start-[10px] top-[10px] text-pqSoft"
              >
                <path
                  d="M17 17l4 4M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
                placeholder={t('search_channels', 'Search channels…')}
                className="h-[34px] w-full rounded-pqSm bg-pqPop pe-[11px] ps-[31px] text-[13px] text-pqText shadow-[inset_0_0_0_1px_var(--border)] outline-none placeholder:text-pqSoft focus-visible:shadow-[inset_0_0_0_1px_var(--brand)]"
              />
            </div>
            <div
              role="group"
              aria-label={t(titleKey, titleDefault)}
              className="flex max-h-[360px] flex-col gap-[6px] overflow-y-auto scrollbar scrollbar-thumb-pqBorder scrollbar-track-pqInner"
            >
              {!visibleData.length && (
                <div className="px-[8px] py-[16px] text-[13.5px] text-pqSoft">
                  {t('no_channels_match', 'No channels match that search.')}
                </div>
              )}
              {visibleData.map((item) => {
                const selected = itemIsContinueSelected(
                  item,
                  selection,
                  isSelected
                );
                return (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    key={getItemId(item)}
                    className={clsx(
                      'flex w-full cursor-pointer items-center gap-[12px] rounded-pqMd px-[14px] py-[10px] text-start transition-colors',
                      listAvatarClass,
                      listAvatarBoxClass,
                      selected
                        ? 'bg-pqNavActive shadow-[inset_0_0_0_1.5px_var(--brand)]'
                        : 'shadow-[inset_0_0_0_1px_var(--border)] hover:bg-pqHover'
                    )}
                    onClick={handleSelect(item)}
                  >
                    {renderItem(item, selected)}
                    {selected && (
                      <SelectedMark className="ms-auto size-[20px] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-[12px]">
              <button
                type="button"
                onClick={handleToggleAll}
                className="cursor-pointer text-[13.5px] font-[600] text-pqFocused hover:underline"
              >
                {allVisibleSelected
                  ? t('clear', 'Clear')
                  : t('select_all', 'Select all')}
              </button>
              {saveButton}
            </div>
          </>
        )}
      </div>
    );
  };
}
