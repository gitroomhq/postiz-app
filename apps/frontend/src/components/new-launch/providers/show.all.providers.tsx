'use client';

import DevtoProvider from '@gitroom/frontend/components/new-launch/providers/devto/devto.provider';
import XProvider from '@gitroom/frontend/components/new-launch/providers/x/x.provider';
import LinkedinProvider from '@gitroom/frontend/components/new-launch/providers/linkedin/linkedin.provider';
import RedditProvider from '@gitroom/frontend/components/new-launch/providers/reddit/reddit.provider';
import MediumProvider from '@gitroom/frontend/components/new-launch/providers/medium/medium.provider';
import HashnodeProvider from '@gitroom/frontend/components/new-launch/providers/hashnode/hashnode.provider';
import FacebookProvider from '@gitroom/frontend/components/new-launch/providers/facebook/facebook.provider';
import InstagramProvider from '@gitroom/frontend/components/new-launch/providers/instagram/instagram.collaborators';
import YoutubeProvider from '@gitroom/frontend/components/new-launch/providers/youtube/youtube.provider';
import TiktokProvider from '@gitroom/frontend/components/new-launch/providers/tiktok/tiktok.provider';
import PinterestProvider from '@gitroom/frontend/components/new-launch/providers/pinterest/pinterest.provider';
import DribbbleProvider from '@gitroom/frontend/components/new-launch/providers/dribbble/dribbble.provider';
import ThreadsProvider from '@gitroom/frontend/components/new-launch/providers/threads/threads.provider';
import DiscordProvider from '@gitroom/frontend/components/new-launch/providers/discord/discord.provider';
import SlackProvider from '@gitroom/frontend/components/new-launch/providers/slack/slack.provider';
import MastodonProvider from '@gitroom/frontend/components/new-launch/providers/mastodon/mastodon.provider';
import BlueskyProvider from '@gitroom/frontend/components/new-launch/providers/bluesky/bluesky.provider';
import LemmyProvider from '@gitroom/frontend/components/new-launch/providers/lemmy/lemmy.provider';
import WarpcastProvider from '@gitroom/frontend/components/new-launch/providers/warpcast/warpcast.provider';
import TelegramProvider from '@gitroom/frontend/components/new-launch/providers/telegram/telegram.provider';
import NostrProvider from '@gitroom/frontend/components/new-launch/providers/nostr/nostr.provider';
import VkProvider from '@gitroom/frontend/components/new-launch/providers/vk/vk.provider';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import { createRef, FC, forwardRef, useImperativeHandle } from 'react';
export const Providers = [
  {
    identifier: 'devto',
    component: DevtoProvider,
  },
  {
    identifier: 'x',
    component: XProvider,
  },
  {
    identifier: 'linkedin',
    component: LinkedinProvider,
  },
  {
    identifier: 'linkedin-page',
    component: LinkedinProvider,
  },
  {
    identifier: 'reddit',
    component: RedditProvider,
  },
  {
    identifier: 'medium',
    component: MediumProvider,
  },
  {
    identifier: 'hashnode',
    component: HashnodeProvider,
  },
  {
    identifier: 'facebook',
    component: FacebookProvider,
  },
  {
    identifier: 'instagram',
    component: InstagramProvider,
  },
  {
    identifier: 'instagram-standalone',
    component: InstagramProvider,
  },
  {
    identifier: 'youtube',
    component: YoutubeProvider,
  },
  {
    identifier: 'tiktok',
    component: TiktokProvider,
  },
  {
    identifier: 'pinterest',
    component: PinterestProvider,
  },
  {
    identifier: 'dribbble',
    component: DribbbleProvider,
  },
  {
    identifier: 'threads',
    component: ThreadsProvider,
  },
  {
    identifier: 'discord',
    component: DiscordProvider,
  },
  {
    identifier: 'slack',
    component: SlackProvider,
  },
  {
    identifier: 'mastodon',
    component: MastodonProvider,
  },
  {
    identifier: 'bluesky',
    component: BlueskyProvider,
  },
  {
    identifier: 'lemmy',
    component: LemmyProvider,
  },
  {
    identifier: 'wrapcast',
    component: WarpcastProvider,
  },
  {
    identifier: 'telegram',
    component: TelegramProvider,
  },
  {
    identifier: 'nostr',
    component: NostrProvider,
  },
  {
    identifier: 'vk',
    component: VkProvider,
  },
];
export const ShowAllProviders = forwardRef((props, ref) => {
  const { current, selectedIntegrations } = useLaunchStore(
    useShallow((state) => ({
      selectedIntegrations: state.selectedIntegrations,
      current: state.current,
    }))
  );

  useImperativeHandle(ref, () => ({
    checkAllValid: async () => {
      return Promise.all(
        selectedIntegrations.map(async (p) => await p.ref?.current.isValid())
      );
    },
  }));

  return (
    <>
      {selectedIntegrations.map((integration) => {
        const { component: ProviderComponent } = Providers.find(
          (provider) =>
            provider.identifier === integration.integration.identifier
        ) || {
          component: Empty,
        };

        return (
          <ProviderComponent
            ref={integration.ref}
            key={integration.integration.id}
            id={integration.integration.id}
          />
        );
      })}
    </>
  );
});

export const Empty: FC = () => {
  return null;
};
