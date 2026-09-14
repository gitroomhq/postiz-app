'use client';

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
  titleDefault: 'Select Tumblr Blog:',
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
          <div className="w-[80px] h-[80px] bg-input rounded-full flex items-center justify-center text-[32px] font-semibold">
            t
          </div>
        )}
      </div>
      <div className="text-sm font-medium">{item.name}</div>
      {item.username && (
        <div className="text-xs text-gray-500 break-all">{item.username}</div>
      )}
      {!!item.followers && (
        <div className="text-xs text-gray-400">
          {item.followers.toLocaleString()} followers
        </div>
      )}
      {item.primary && <div className="text-xs text-gray-400">Primary</div>}
    </>
  ),
});
