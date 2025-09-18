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
import React, { FC, forwardRef, useEffect, useImperativeHandle } from 'react';
import { GeneralPreviewComponent } from '@gitroom/frontend/components/launches/general.preview.component';
import { IntegrationContext } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { PostComment } from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import WordpressProvider from '@gitroom/frontend/components/new-launch/providers/wordpress/wordpress.provider';
import ListmonkProvider from '@gitroom/frontend/components/new-launch/providers/listmonk/listmonk.provider';

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
  {
    identifier: 'wordpress',
    component: WordpressProvider,
  },
  {
    identifier: 'listmonk',
    component: ListmonkProvider,
  },
];
export const ShowAllProviders = forwardRef((props, ref) => {
  const { date, current, global, selectedIntegrations, allIntegrations } =
    useLaunchStore(
      useShallow((state) => ({
        date: state.date,
        selectedIntegrations: state.selectedIntegrations,
        allIntegrations: state.integrations,
        current: state.current,
        global: state.global,
      }))
    );

  const t = useT();

  useImperativeHandle(ref, () => ({
    checkAllValid: async () => {
      return Promise.all(
        selectedIntegrations.map(async (p) => await p.ref?.current.isValid())
      );
    },
    getAllValues: async () => {
      return Promise.all(
        selectedIntegrations.map(async (p) => await p.ref?.current.getValues())
      );
    },
    triggerAll: () => {
      return selectedIntegrations.map(
        async (p) => await p.ref?.current.trigger()
      );
    },
  }));

  return (
    <div className="w-full flex flex-col flex-1">
      {current === 'global' && (
        <IntegrationContext.Provider
          value={{
            date,
            integration:
              selectedIntegrations?.[0]?.integration || allIntegrations?.[0],
            allIntegrations: selectedIntegrations.map((p) => p.integration),
            value: global.map((p) => ({
              id: p.id,
              content: p.content,
              image: p.media,
            })),
          }}
        >
          <div className="flex gap-[4px] mb-[20px]">
            <div className="flex-1 flex p-[4px] border border-newTableBorder rounded-[8px]">
              <div className="rounded-[4px] flex-1 overflow-hidden whitespace-nowrap text-center pt-[6px] pb-[5px] text-textItemFocused bg-boxFocused">
                {t('preview', 'Preview')}
              </div>
            </div>
          </div>
          {global?.[0]?.content?.length === 0 ? (
            <div>
              {t(
                'start_writing_your_post',
                'Start writing your post for a preview'
              )}
            </div>
          ) : (
            <GeneralPreviewComponent maximumCharacters={100000000} />
          )}
        </IntegrationContext.Provider>
      )}
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
    </div>
  );
});

export const Empty: FC = () => {
  return null;
};
