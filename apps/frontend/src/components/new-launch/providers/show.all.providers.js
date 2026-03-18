'use client';
import { __awaiter } from "tslib";
import DevtoProvider from "./devto/devto.provider";
import XProvider from "./x/x.provider";
import LinkedinProvider from "./linkedin/linkedin.provider";
import RedditProvider from "./reddit/reddit.provider";
import MediumProvider from "./medium/medium.provider";
import HashnodeProvider from "./hashnode/hashnode.provider";
import FacebookProvider from "./facebook/facebook.provider";
import InstagramProvider from "./instagram/instagram.collaborators";
import YoutubeProvider from "./youtube/youtube.provider";
import TiktokProvider from "./tiktok/tiktok.provider";
import PinterestProvider from "./pinterest/pinterest.provider";
import DribbbleProvider from "./dribbble/dribbble.provider";
import ThreadsProvider from "./threads/threads.provider";
import DiscordProvider from "./discord/discord.provider";
import SlackProvider from "./slack/slack.provider";
import KickProvider from "./kick/kick.provider";
import TwitchProvider from "./twitch/twitch.provider";
import MastodonProvider from "./mastodon/mastodon.provider";
import BlueskyProvider from "./bluesky/bluesky.provider";
import LemmyProvider from "./lemmy/lemmy.provider";
import WarpcastProvider from "./warpcast/warpcast.provider";
import TelegramProvider from "./telegram/telegram.provider";
import NostrProvider from "./nostr/nostr.provider";
import VkProvider from "./vk/vk.provider";
import { useLaunchStore } from "../store";
import { useShallow } from 'zustand/react/shallow';
import React, { forwardRef, useImperativeHandle } from 'react';
import { GeneralPreviewComponent } from "../../launches/general.preview.component";
import { IntegrationContext } from "../../launches/helpers/use.integration";
import { useT } from "../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import WordpressProvider from "./wordpress/wordpress.provider";
import ListmonkProvider from "./listmonk/listmonk.provider";
import GmbProvider from "./gmb/gmb.provider";
import MoltbookProvider from "./moltbook/moltbook.provider";
import SkoolProvider from "./skool/skool.provider";
import WhopProvider from "./whop/whop.provider";
import MeweProvider from "./mewe/mewe.provider";
import GhostProvider from "./ghost/ghost.provider";
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
        identifier: 'ghost',
        component: GhostProvider,
    },
];
export const ShowAllProviders = forwardRef((props, ref) => {
    var _a, _b, _c;
    const { date, current, global, selectedIntegrations, allIntegrations } = useLaunchStore(useShallow((state) => ({
        date: state.date,
        selectedIntegrations: state.selectedIntegrations,
        allIntegrations: state.integrations,
        current: state.current,
        global: state.global,
    })));
    const t = useT();
    useImperativeHandle(ref, () => ({
        checkAllValid: () => __awaiter(void 0, void 0, void 0, function* () {
            return Promise.all(selectedIntegrations.map((p) => __awaiter(void 0, void 0, void 0, function* () { var _a; return yield ((_a = p.ref) === null || _a === void 0 ? void 0 : _a.current.isValid()); })));
        }),
        getAllValues: () => __awaiter(void 0, void 0, void 0, function* () {
            return Promise.all(selectedIntegrations.map((p) => __awaiter(void 0, void 0, void 0, function* () { var _a; return yield ((_a = p.ref) === null || _a === void 0 ? void 0 : _a.current.getValues()); })));
        }),
        triggerAll: () => {
            return selectedIntegrations.map((p) => __awaiter(void 0, void 0, void 0, function* () { var _a; return yield ((_a = p.ref) === null || _a === void 0 ? void 0 : _a.current.trigger()); }));
        },
    }));
    return (<div className="w-full flex flex-col flex-1">
      {current === 'global' && (<IntegrationContext.Provider value={{
                date,
                integration: ((_a = selectedIntegrations === null || selectedIntegrations === void 0 ? void 0 : selectedIntegrations[0]) === null || _a === void 0 ? void 0 : _a.integration) || (allIntegrations === null || allIntegrations === void 0 ? void 0 : allIntegrations[0]),
                allIntegrations: selectedIntegrations.map((p) => p.integration),
                value: global.map((p) => ({
                    id: p.id,
                    content: p.content,
                    image: p.media,
                })),
            }}>
          {((_c = (_b = global === null || global === void 0 ? void 0 : global[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.length) === 0 ? (<div>
              {t('start_writing_your_post', 'Start writing your post for a preview')}
            </div>) : (<div className="border border-borderPreview rounded-[12px] shadow-previewShadow">
              <GeneralPreviewComponent maximumCharacters={100000000}/>
            </div>)}
        </IntegrationContext.Provider>)}
      {selectedIntegrations.map((integration) => {
            const { component: ProviderComponent } = Providers.find((provider) => provider.identifier === integration.integration.identifier) || {
                component: Empty,
            };
            return (<ProviderComponent ref={integration.ref} key={integration.integration.id} id={integration.integration.id}/>);
        })}
    </div>);
});
export const Empty = () => {
    return null;
};
//# sourceMappingURL=show.all.providers.js.map