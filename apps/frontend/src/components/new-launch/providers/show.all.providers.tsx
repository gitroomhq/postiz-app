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
import KickProvider from '@gitroom/frontend/components/new-launch/providers/kick/kick.provider';
import TwitchProvider from '@gitroom/frontend/components/new-launch/providers/twitch/twitch.provider';
import MastodonProvider from '@gitroom/frontend/components/new-launch/providers/mastodon/mastodon.provider';
import BlueskyProvider from '@gitroom/frontend/components/new-launch/providers/bluesky/bluesky.provider';
import LemmyProvider from '@gitroom/frontend/components/new-launch/providers/lemmy/lemmy.provider';
import WarpcastProvider from '@gitroom/frontend/components/new-launch/providers/warpcast/warpcast.provider';
import TelegramProvider from '@gitroom/frontend/components/new-launch/providers/telegram/telegram.provider';
import NostrProvider from '@gitroom/frontend/components/new-launch/providers/nostr/nostr.provider';
import VkProvider from '@gitroom/frontend/components/new-launch/providers/vk/vk.provider';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import React, {
  FC,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import WordpressProvider from '@gitroom/frontend/components/new-launch/providers/wordpress/wordpress.provider';
import ListmonkProvider from '@gitroom/frontend/components/new-launch/providers/listmonk/listmonk.provider';
import GmbProvider from '@gitroom/frontend/components/new-launch/providers/gmb/gmb.provider';
import MoltbookProvider from '@gitroom/frontend/components/new-launch/providers/moltbook/moltbook.provider';
import SkoolProvider from '@gitroom/frontend/components/new-launch/providers/skool/skool.provider';
import WhopProvider from '@gitroom/frontend/components/new-launch/providers/whop/whop.provider';
import MeweProvider from '@gitroom/frontend/components/new-launch/providers/mewe/mewe.provider';
import TumblrProvider from '@gitroom/frontend/components/new-launch/providers/tumblr/tumblr.provider';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { GlobalIcon } from '@gitroom/frontend/components/ui/icons';
import clsx from 'clsx';

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
    identifier: 'kick',
    component: KickProvider,
  },
  {
    identifier: 'twitch',
    component: TwitchProvider,
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
  {
    identifier: 'gmb',
    component: GmbProvider,
  },
  {
    identifier: 'moltbook',
    component: MoltbookProvider,
  },
  {
    identifier: 'skool',
    component: SkoolProvider,
  },
  {
    identifier: 'whop',
    component: WhopProvider,
  },
  {
    identifier: 'mewe',
    component: MeweProvider,
  },
  {
    identifier: 'tumblr',
    component: TumblrProvider,
  },
];

/**
 * Global mode: stack every selected channel’s native preview.
 * Ads Manager–style chips filter which cards stay visible without leaving
 * global edit (`setCurrent` stays `'global'`).
 */
export const ShowAllProviders = forwardRef((props, ref) => {
  const { current, selectedIntegrations, global, internal } = useLaunchStore(
    useShallow((state) => ({
      selectedIntegrations: state.selectedIntegrations,
      current: state.current,
      global: state.global,
      internal: state.internal,
    }))
  );

  const t = useT();
  // null = show all; string = solo that channel id
  const [previewFocus, setPreviewFocus] = useState<string | null>(null);

  const selectedIds = useMemo(
    () => selectedIntegrations.map((p) => p.integration.id),
    [selectedIntegrations]
  );

  const previewHasContent = useMemo(() => {
    const channels = previewFocus
      ? selectedIntegrations.filter((p) => p.integration.id === previewFocus)
      : selectedIntegrations;
    return channels.some(({ integration }) => {
      const custom = internal.find((p) => p.integration.id === integration.id);
      const values = custom?.integrationValue?.length
        ? custom.integrationValue
        : global;
      return !!values?.[0]?.content?.length;
    });
  }, [selectedIntegrations, previewFocus, internal, global]);

  // Drop focus if the channel was deselected.
  useEffect(() => {
    if (previewFocus && !selectedIds.includes(previewFocus)) {
      setPreviewFocus(null);
    }
  }, [previewFocus, selectedIds]);

  // Leaving global clears the filter so per-channel tab is clean.
  useEffect(() => {
    if (current !== 'global') {
      setPreviewFocus(null);
    }
  }, [current]);

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

  const isGlobal = current === 'global';
  const showChips = isGlobal && selectedIntegrations.length > 1;

  return (
    <div className="flex w-full flex-1 flex-col">
      {selectedIntegrations.length === 0 ? (
        <div className="rounded-[14px] bg-pqInner px-[24px] py-[48px] text-center text-[13.5px] text-pqMuted shadow-[inset_0_0_0_1px_var(--border)]">
          {t(
            'check_circles_above',
            'Check the circles above to pick a channel'
          )}
        </div>
      ) : (
        <>
          {showChips && (
            <div
              className="mb-[14px] flex flex-wrap items-center gap-[10px]"
              data-pq="preview-channel-filter"
            >
              <button
                type="button"
                onClick={() => setPreviewFocus(null)}
                title={t('all_previews', 'All')}
                data-tooltip-id="tooltip"
                data-tooltip-content={t(
                  'global_editing_tooltip',
                  'Global — same post for all channels'
                )}
                className={clsx(
                  'flex h-[44px] w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-pqTableHeader text-pqPink transition-all',
                  previewFocus === null
                    ? 'shadow-[inset_0_0_0_1.5px_var(--pink)]'
                    : 'opacity-70 shadow-[inset_0_0_0_1.5px_transparent] hover:opacity-100'
                )}
              >
                <GlobalIcon />
              </button>
              {selectedIntegrations.map(({ integration }) => {
                const active = previewFocus === integration.id;
                return (
                  <button
                    key={integration.id}
                    type="button"
                    title={integration.name}
                    data-tooltip-id="tooltip"
                    data-tooltip-content={integration.name}
                    onClick={() =>
                      setPreviewFocus((prev) =>
                        prev === integration.id ? null : integration.id
                      )
                    }
                    className={clsx(
                      'relative flex h-[44px] w-[44px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[10px] bg-pqSettings transition-all',
                      active
                        ? 'shadow-[inset_0_0_0_1.5px_var(--brand)]'
                        : 'grayscale opacity-70 shadow-[inset_0_0_0_1.5px_transparent] hover:opacity-100'
                    )}
                  >
                    <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[9px]">
                      <ImageWithFallback
                        fallbackSrc="/no-picture.jpg"
                        src={integration.picture || '/no-picture.jpg'}
                        className="min-h-[40px] min-w-[40px] rounded-[8px]"
                        alt={integration.identifier}
                        width={40}
                        height={40}
                      />
                      {integration.identifier === 'youtube' ? (
                        <img
                          src="/icons/platforms/youtube.svg"
                          className="absolute bottom-[2px] end-[2px] z-10 min-w-[14px]"
                          width={14}
                          alt=""
                        />
                      ) : (
                        <SafeImage
                          src={`/icons/platforms/${integration.identifier}.png`}
                          className="absolute bottom-[2px] end-[2px] z-10 min-h-[14px] min-w-[14px] rounded-[3px]"
                          alt={integration.identifier}
                          width={14}
                          height={14}
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {isGlobal && previewFocus && (
            <style>{`[data-preview-channel]:not([data-preview-channel="${previewFocus}"]) { display: none !important; }`}</style>
          )}
          {isGlobal && !previewHasContent && (
            <div className="rounded-[14px] bg-pqInner px-[24px] py-[48px] text-center text-[13.5px] text-pqMuted shadow-[inset_0_0_0_1px_var(--border)]">
              {t(
                'start_writing_your_post',
                'Start writing your post for a preview'
              )}
            </div>
          )}
          {!(isGlobal && !previewHasContent) &&
            selectedIntegrations.map((integration) => {
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
      )}
    </div>
  );
});

export const Empty: FC = () => {
  return null;
};
