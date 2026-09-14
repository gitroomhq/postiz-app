'use client';

import {
  ContinuePickerItem,
  continuePickerHandle,
  continuePickerInitial,
  joinContinuePickerMeta,
} from '../continue-picker-item';
import { withContinueProvider } from '../with-continue-provider';

interface TumblrBlogItem {
  id: string;
  name: string;
  username?: string;
  followers?: number;
  primary?: boolean;
  picture?: {
    data: {
      url: string;
    };
  };
}

interface TumblrBlogSelection {
  id: string;
}

export const TumblrContinue = withContinueProvider<
  TumblrBlogItem,
  TumblrBlogSelection
>({
  endpoint: 'pages',
  swrKey: 'load-tumblr-blogs',
  titleKey: 'select_tumblr_blog',
  titleDefault: 'Select Tumblr Blog',
  emptyStateMessages: [
    {
      key: 'tumblr_no_blogs_found',
      text: "We couldn't find any Tumblr blogs connected to your account.",
    },
    {
      key: 'tumblr_ensure_blog_exists',
      text: 'Please ensure your Tumblr account has a blog you can post to.',
    },
    {
      key: 'tumblr_try_again',
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
        continuePickerHandle(item.username),
        item.followers
          ? `${item.followers.toLocaleString()} followers`
          : undefined,
        item.primary ? 'Primary' : undefined,
      )}
      fallback={continuePickerInitial(item.name)}
    />
  ),
});
