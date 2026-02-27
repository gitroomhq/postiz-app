'use client';

import React, { FC, useCallback, useState } from 'react';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import clsx from 'clsx';
import { useClickOutside } from '@mantine/hooks';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { DropdownArrowIcon } from '@gitroom/frontend/components/ui/icons';

export const SelectChannel: FC<{
  onChange: (value: string) => void;
  integrations: Integrations[];
  channels?: string;
}> = (props) => {
  const { onChange, integrations, channels: currentChannels } = props;
  const toaster = useToaster();
  const t = useT();
  const [selectedChannels, setSelectedChannels] = useState<string[]>(
    currentChannels ? currentChannels.split(',') : []
  );
  const [pos, setPos] = useState<any>({});
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => {
    if (open) {
      setOpen(false);
    }
  });

  const openClose = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }

    const { x, y, height } = ref.current?.getBoundingClientRect();
    setPos({ top: y + height, left: x });
    setOpen(true);
  }, [open]);

  const toggleChannel = useCallback(
    (channelId: string) => {
      const newSelected = selectedChannels.includes(channelId)
        ? selectedChannels.filter((id) => id !== channelId)
        : [...selectedChannels, channelId];

      setSelectedChannels(newSelected);
      onChange(newSelected.join(','));

      if (newSelected.length === 0) {
        toaster.show(t('all_channels_selected', 'All channels selected'), 'success');
      } else {
        toaster.show(
          t('channels_filtered', `${newSelected.length} channel(s) selected`),
          'success'
        );
      }
    },
    [selectedChannels, onChange, toaster, t]
  );

  const clearAll = useCallback(() => {
    setSelectedChannels([]);
    onChange('');
    toaster.show(t('all_channels_selected', 'All channels selected'), 'success');
  }, [onChange, toaster, t]);

  return (
    <div className="relative select-none z-[500]" ref={ref}>
      <div
        data-tooltip-id="tooltip"
        data-tooltip-content={t('select_channel_tooltip', 'Select Channels')}
        onClick={openClose}
        className={clsx(
          'relative z-[20] cursor-pointer h-[42px] rounded-[8px] pl-[16px] pr-[12px] gap-[8px] border flex items-center',
          open ? 'border-[#612BD3]' : 'border-newColColor'
        )}
      >
        <div className="flex items-center gap-[6px]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          {selectedChannels.length > 0 && (
            <span className="text-[12px] bg-[#612BD3] text-white rounded-full w-[18px] h-[18px] flex items-center justify-center">
              {selectedChannels.length}
            </span>
          )}
        </div>
        <div>
          <DropdownArrowIcon rotated={open} />
        </div>
      </div>
      {open && (
        <div
          style={pos}
          className="flex flex-col fixed pt-[12px] bg-newBgColorInner menu-shadow min-w-[300px] max-h-[400px] overflow-y-auto"
        >
          <div className="flex justify-between items-center px-[12px] mb-[8px]">
            <div className="text-[14px] font-[600]">
              {t('channels', 'Channels')}
            </div>
            {selectedChannels.length > 0 && (
              <button
                onClick={clearAll}
                className="text-[12px] text-[#612BD3] hover:underline"
              >
                {t('clear_all', 'Clear All')}
              </button>
            )}
          </div>
          {integrations.map((integration) => (
            <div
              key={integration.id}
              onClick={() => toggleChannel(integration.id)}
              className={clsx(
                'p-[12px] hover:bg-newBgColor text-[14px] font-[500] flex items-center gap-[12px] cursor-pointer',
                selectedChannels.includes(integration.id) && 'bg-newBgColor'
              )}
            >
              <div
                className={clsx(
                  'w-[18px] h-[18px] border-2 rounded-[4px] flex items-center justify-center',
                  selectedChannels.includes(integration.id)
                    ? 'border-[#612BD3] bg-[#612BD3]'
                    : 'border-newColColor'
                )}
              >
                {selectedChannels.includes(integration.id) && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>
              <img
                src={integration.picture}
                alt={integration.name}
                className="w-[24px] h-[24px] rounded-full"
              />
              <div className="flex-1">
                <div className="font-[500]">{integration.name}</div>
                <div className="text-[12px] text-gray-500">
                  {integration.identifier}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
