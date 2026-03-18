import { __awaiter, __decorate } from "tslib";
import 'reflect-metadata';
import { Injectable } from '@nestjs/common';
import { XProvider } from "./social/x.provider";
import { LinkedinProvider } from "./social/linkedin.provider";
import { RedditProvider } from "./social/reddit.provider";
import { DevToProvider } from "./social/dev.to.provider";
import { HashnodeProvider } from "./social/hashnode.provider";
import { MediumProvider } from "./social/medium.provider";
import { FacebookProvider } from "./social/facebook.provider";
import { InstagramProvider } from "./social/instagram.provider";
import { YoutubeProvider } from "./social/youtube.provider";
import { TiktokProvider } from "./social/tiktok.provider";
import { PinterestProvider } from "./social/pinterest.provider";
import { DribbbleProvider } from "./social/dribbble.provider";
import { LinkedinPageProvider } from "./social/linkedin.page.provider";
import { ThreadsProvider } from "./social/threads.provider";
import { DiscordProvider } from "./social/discord.provider";
import { SlackProvider } from "./social/slack.provider";
import { MastodonProvider } from "./social/mastodon.provider";
import { BlueskyProvider } from "./social/bluesky.provider";
import { LemmyProvider } from "./social/lemmy.provider";
import { InstagramStandaloneProvider } from "./social/instagram.standalone.provider";
import { FarcasterProvider } from "./social/farcaster.provider";
import { TelegramProvider } from "./social/telegram.provider";
import { NostrProvider } from "./social/nostr.provider";
import { VkProvider } from "./social/vk.provider";
import { WordpressProvider } from "./social/wordpress.provider";
import { ListmonkProvider } from "./social/listmonk.provider";
import { GmbProvider } from "./social/gmb.provider";
import { KickProvider } from "./social/kick.provider";
import { TwitchProvider } from "./social/twitch.provider";
import { MoltbookProvider } from "./social/moltbook.provider";
import { SkoolProvider } from "./social/skool.provider";
import { WhopProvider } from "./social/whop.provider";
import { MeweProvider } from "./social/mewe.provider";
import { GhostProvider } from "./social/ghost.provider";
export const socialIntegrationList = [
    new XProvider(),
    new LinkedinProvider(),
    new LinkedinPageProvider(),
    new RedditProvider(),
    new InstagramProvider(),
    new InstagramStandaloneProvider(),
    new FacebookProvider(),
    new ThreadsProvider(),
    new YoutubeProvider(),
    new GmbProvider(),
    new TiktokProvider(),
    new PinterestProvider(),
    new DribbbleProvider(),
    new DiscordProvider(),
    new SlackProvider(),
    new KickProvider(),
    new TwitchProvider(),
    new MastodonProvider(),
    new BlueskyProvider(),
    new LemmyProvider(),
    new FarcasterProvider(),
    new TelegramProvider(),
    new NostrProvider(),
    new VkProvider(),
    new MediumProvider(),
    new DevToProvider(),
    new HashnodeProvider(),
    new WordpressProvider(),
    new ListmonkProvider(),
    new MoltbookProvider(),
    new WhopProvider(),
    new SkoolProvider(),
    new MeweProvider(),
    new GhostProvider(),
    // new MastodonCustomProvider(),
];
let IntegrationManager = class IntegrationManager {
    getAllIntegrations() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                social: yield Promise.all(socialIntegrationList.map((p) => __awaiter(this, void 0, void 0, function* () {
                    return (Object.assign(Object.assign({ name: p.name, identifier: p.identifier, toolTip: p.toolTip, editor: p.editor, isExternal: !!p.externalUrl, isWeb3: !!p.isWeb3, isChromeExtension: !!p.isChromeExtension }, (p.extensionCookies ? { extensionCookies: p.extensionCookies } : {})), (p.customFields ? { customFields: yield p.customFields() } : {})));
                }))),
                article: [],
            };
        });
    }
    getAllTools() {
        return socialIntegrationList.reduce((all, current) => (Object.assign(Object.assign({}, all), { [current.identifier]: Reflect.getMetadata('custom:tool', current.constructor.prototype) ||
                [] })), {});
    }
    getAllRulesDescription() {
        return socialIntegrationList.reduce((all, current) => (Object.assign(Object.assign({}, all), { [current.identifier]: Reflect.getMetadata('custom:rules:description', current.constructor) || '' })), {});
    }
    getAllPlugs() {
        return socialIntegrationList
            .map((p) => {
            return {
                name: p.name,
                identifier: p.identifier,
                plugs: (Reflect.getMetadata('custom:plug', p.constructor.prototype) || [])
                    .filter((f) => !f.disabled)
                    .map((p) => (Object.assign(Object.assign({}, p), { fields: p.fields.map((c) => {
                        var _a;
                        return (Object.assign(Object.assign({}, c), { validation: (_a = c === null || c === void 0 ? void 0 : c.validation) === null || _a === void 0 ? void 0 : _a.toString() }));
                    }) }))),
            };
        })
            .filter((f) => f.plugs.length);
    }
    getInternalPlugs(providerName) {
        const p = socialIntegrationList.find((p) => p.identifier === providerName);
        return {
            internalPlugs: (Reflect.getMetadata('custom:internal_plug', p.constructor.prototype) || []).filter((f) => !f.disabled) || [],
        };
    }
    getAllowedSocialsIntegrations() {
        return socialIntegrationList.map((p) => p.identifier);
    }
    getSocialIntegration(integration) {
        return socialIntegrationList.find((i) => i.identifier === integration);
    }
};
IntegrationManager = __decorate([
    Injectable()
], IntegrationManager);
export { IntegrationManager };
//# sourceMappingURL=integration.manager.js.map