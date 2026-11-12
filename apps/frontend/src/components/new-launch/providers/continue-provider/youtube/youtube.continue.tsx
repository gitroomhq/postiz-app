'use client';

import { withContinueProvider } from '../with-continue-provider';

interface YoutubeItem {
  id: string;
  name: string;
  username?: string;
  subscriberCount?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

interface YoutubeSelection {
  id: string;
}

export const YoutubeContinue = withContinueProvider<
  YoutubeItem,
  YoutubeSelection
>({
  endpoint: 'pages',
  swrKey: 'load-youtube-channels',
  titleKey: 'select_channel',
  titleDefault: 'Select YouTube Channel:',
  emptyStateMessages: [
    {
      key: 'youtube_no_channels_found',
      text: "We couldn't find any YouTube channels connected to your account.",
    },
    {
      key: 'youtube_ensure_channel_exists',
      text: 'Please ensure you have a YouTube channel created.',
    },
    {
      key: 'youtube_try_again',
      text: 'Please close this dialog, delete the integration and try again.',
    },
  ],
  getItemId: (item) => item.id,
  getSelectionValue: (item) => ({ id: item.id }),
  transformSaveData: (selection) => selection,
  isSelected: (item, selection) => selection?.id === item.id,
  renderItem: (item) => (
    <>
      <div className="flex justify-center">
        {item.picture?.data?.url ? (
          <img
            className="w-[80px] h-[80px] object-cover rounded-full"
            src={item.picture.data.url}
            alt={item.name}
          />
        ) : (
          <img
            className="w-[80px] h-[80px] object-cover rounded-full"
            src="/no-picture.jpg"
            alt={item.name}
          />
        )}
      </div>
      <div className="text-sm font-medium">{item.name}</div>
      {item.username && (
        <div className="text-xs text-gray-500">{item.username}</div>
      )}
      {item.subscriberCount && (
        <div className="text-xs text-gray-400">
          {parseInt(item.subscriberCount).toLocaleString()} subscribers
        </div>
      )}
    </>
  ),
});
