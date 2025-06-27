import 'reflect-metadata';

import { Injectable } from '@nestjs/common';
import { XProvider } from '@chaolaolo/nestjs-libraries/integrations/social/x.provider';
import { SocialProvider } from '@chaolaolo/nestjs-libraries/integrations/social/social.integrations.interface';
import { LinkedinProvider } from '@chaolaolo/nestjs-libraries/integrations/social/linkedin.provider';
import { RedditProvider } from '@chaolaolo/nestjs-libraries/integrations/social/reddit.provider';
import { DevToProvider } from '@chaolaolo/nestjs-libraries/integrations/article/dev.to.provider';
import { HashnodeProvider } from '@chaolaolo/nestjs-libraries/integrations/article/hashnode.provider';
import { MediumProvider } from '@chaolaolo/nestjs-libraries/integrations/article/medium.provider';
import { ArticleProvider } from '@chaolaolo/nestjs-libraries/integrations/article/article.integrations.interface';
import { FacebookProvider } from '@chaolaolo/nestjs-libraries/integrations/social/facebook.provider';
import { InstagramProvider } from '@chaolaolo/nestjs-libraries/integrations/social/instagram.provider';
import { YoutubeProvider } from '@chaolaolo/nestjs-libraries/integrations/social/youtube.provider';
import { TiktokProvider } from '@chaolaolo/nestjs-libraries/integrations/social/tiktok.provider';
import { PinterestProvider } from '@chaolaolo/nestjs-libraries/integrations/social/pinterest.provider';
import { DribbbleProvider } from '@chaolaolo/nestjs-libraries/integrations/social/dribbble.provider';
import { LinkedinPageProvider } from '@chaolaolo/nestjs-libraries/integrations/social/linkedin.page.provider';
import { ThreadsProvider } from '@chaolaolo/nestjs-libraries/integrations/social/threads.provider';
import { DiscordProvider } from '@chaolaolo/nestjs-libraries/integrations/social/discord.provider';
import { SlackProvider } from '@chaolaolo/nestjs-libraries/integrations/social/slack.provider';
import { MastodonProvider } from '@chaolaolo/nestjs-libraries/integrations/social/mastodon.provider';
import { BlueskyProvider } from '@chaolaolo/nestjs-libraries/integrations/social/bluesky.provider';
import { LemmyProvider } from '@chaolaolo/nestjs-libraries/integrations/social/lemmy.provider';
import { InstagramStandaloneProvider } from '@chaolaolo/nestjs-libraries/integrations/social/instagram.standalone.provider';
import { FarcasterProvider } from '@chaolaolo/nestjs-libraries/integrations/social/farcaster.provider';
import { TelegramProvider } from '@chaolaolo/nestjs-libraries/integrations/social/telegram.provider';
import { NostrProvider } from '@chaolaolo/nestjs-libraries/integrations/social/nostr.provider';
import { VkProvider } from '@chaolaolo/nestjs-libraries/integrations/social/vk.provider';

export const socialIntegrationList: SocialProvider[] = [
  new XProvider(),
  new LinkedinProvider(),
  new LinkedinPageProvider(),
  new RedditProvider(),
  new InstagramProvider(),
  new InstagramStandaloneProvider(),
  new FacebookProvider(),
  new ThreadsProvider(),
  new YoutubeProvider(),
  new TiktokProvider(),
  new PinterestProvider(),
  new DribbbleProvider(),
  new DiscordProvider(),
  new SlackProvider(),
  new MastodonProvider(),
  new BlueskyProvider(),
  new LemmyProvider(),
  new FarcasterProvider(),
  new TelegramProvider(),
  new NostrProvider(),
  new VkProvider(),
  // new MastodonCustomProvider(),
];

const articleIntegrationList = [
  new DevToProvider(),
  new HashnodeProvider(),
  new MediumProvider(),
];

@Injectable()
export class IntegrationManager {
  async getAllIntegrations() {
    return {
      social: await Promise.all(
        socialIntegrationList.map(async (p) => ({
          name: p.name,
          identifier: p.identifier,
          toolTip: p.toolTip,
          isExternal: !!p.externalUrl,
          isWeb3: !!p.isWeb3,
          ...(p.customFields ? { customFields: await p.customFields() } : {}),
        }))
      ),
      article: articleIntegrationList.map((p) => ({
        name: p.name,
        identifier: p.identifier,
      })),
    };
  }

  getAllPlugs() {
    return socialIntegrationList
      .map((p) => {
        return {
          name: p.name,
          identifier: p.identifier,
          plugs: (
            Reflect.getMetadata('custom:plug', p.constructor.prototype) || []
          ).map((p: any) => ({
            ...p,
            fields: p.fields.map((c: any) => ({
              ...c,
              validation: c?.validation?.toString(),
            })),
          })),
        };
      })
      .filter((f) => f.plugs.length);
  }

  getInternalPlugs(providerName: string) {
    const p = socialIntegrationList.find((p) => p.identifier === providerName)!;
    return {
      internalPlugs:
        Reflect.getMetadata('custom:internal_plug', p.constructor.prototype) ||
        [],
    };
  }

  getAllowedSocialsIntegrations() {
    return socialIntegrationList.map((p) => p.identifier);
  }
  getSocialIntegration(integration: string): SocialProvider {
    return socialIntegrationList.find((i) => i.identifier === integration)!;
  }
  getAllowedArticlesIntegrations() {
    return articleIntegrationList.map((p) => p.identifier);
  }
  getArticlesIntegration(integration: string): ArticleProvider {
    return articleIntegrationList.find((i) => i.identifier === integration)!;
  }
}
