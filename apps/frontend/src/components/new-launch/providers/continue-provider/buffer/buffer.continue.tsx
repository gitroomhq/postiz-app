'use client';

import { withContinueProvider } from '../with-continue-provider';

interface BufferItem {
  id: string;
  name: string;
  service?: string;
  avatar?: string;
}

interface BufferSelection {
  id: string;
}

export const BufferContinue = withContinueProvider<BufferItem, BufferSelection>(
  {
    endpoint: 'pages',
    swrKey: 'load-buffer-channels',
    titleKey: 'select_buffer_profile',
    titleDefault: 'Select Buffer profile:',
    emptyStateMessages: [
      {
        key: 'buffer_no_profiles_found',
        text: "We couldn't find any Buffer profiles for this API key.",
      },
      {
        key: 'buffer_connect_a_profile',
        text: 'Connect a profile in Buffer, then try again.',
      },
    ],
    getItemId: (item) => item.id,
    getSelectionValue: (item) => ({ id: item.id }),
    transformSaveData: (selection) => selection,
    isSelected: (item, selection) => selection?.id === item.id,
    renderItem: (item) => (
      <>
        <div className="flex justify-center">
          {item.avatar?.startsWith('https://') ? (
            <img
              className="w-[80px] h-[80px] object-cover rounded-full"
              src={item.avatar}
              alt={item.name}
            />
          ) : (
            <img
              className="w-[80px] h-[80px] object-contain"
              src="/icons/platforms/buffer.png"
              alt={item.name}
            />
          )}
        </div>
        <div className="text-sm font-medium">{item.name}</div>
        {item.service ? (
          <div className="text-xs text-gray-500">{item.service}</div>
        ) : null}
      </>
    ),
  }
);
