'use client';

import {
  ContinuePickerItem,
  joinContinuePickerMeta,
} from '../continue-picker-item';
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
  titleDefault: 'Select YouTube Channel',
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
  transformSaveData: (selection) =>
    Array.isArray(selection) ? { pages: selection } : selection,
  isSelected: (item, selection) => selection?.id === item.id,
  renderItem: (item) => (
    <ContinuePickerItem
      pictureUrl={item.picture?.data?.url}
      name={item.name}
      meta={joinContinuePickerMeta(
        item.username || 'YouTube',
        item.subscriberCount
          ? `${parseInt(item.subscriberCount, 10).toLocaleString()} subscribers`
          : undefined,
      )}
      fallback={
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
          <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
        </svg>
      }
    />
  ),
});
