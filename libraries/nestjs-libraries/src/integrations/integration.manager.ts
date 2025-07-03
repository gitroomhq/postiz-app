import 'reflect-metadata';

import { Injectable } from '@nestjs/common';
import { XProvider } from '@gitroom/nestjs-libraries/integrations/social/x.provider';
import { SocialProvider } from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { LinkedinProvider } from '@gitroom/nestjs-libraries/integrations/social/linkedin.provider';
import { RedditProvider } from '@gitroom/nestjs-libraries/integrations/social/reddit.provider';
import { DevToProvider } from '@gitroom/nestjs-libraries/integrations/article/dev.to.provider';
import { HashnodeProvider } from '@gitroom/nestjs-libraries/integrations/article/hashnode.provider';
import { MediumProvider } from '@gitroom/nestjs-libraries/integrations/article/medium.provider';
import { ArticleProvider } from '@gitroom/nestjs-libraries/integrations/article/article.integrations.interface';
import { FacebookProvider } from '@gitroom/nestjs-libraries/integrations/social/facebook.provider';
import { InstagramProvider } from '@gitroom/nestjs-libraries/integrations/social/instagram.provider';
import { YoutubeProvider } from '@gitroom/nestjs-libraries/integrations/social/youtube.provider';
import { TiktokProvider } from '@gitroom/nestjs-libraries/integrations/social/tiktok.provider';
import { PinterestProvider } from '@gitroom/nestjs-libraries/integrations/social/pinterest.provider';
import { DribbbleProvider } from '@gitroom/nestjs-libraries/integrations/social/dribbble.provider';
import { LinkedinPageProvider } from '@gitroom/nestjs-libraries/integrations/social/linkedin.page.provider';
import { ThreadsProvider } from '@gitroom/nestjs-libraries/integrations/social/threads.provider';
import { DiscordProvider } from '@gitroom/nestjs-libraries/integrations/social/discord.provider';
import { SlackProvider } from '@gitroom/nestjs-libraries/integrations/social/slack.provider';
import { MastodonProvider } from '@gitroom/nestjs-libraries/integrations/social/mastodon.provider';
import { BlueskyProvider } from '@gitroom/nestjs-libraries/integrations/social/bluesky.provider';
import { LemmyProvider } from '@gitroom/nestjs-libraries/integrations/social/lemmy.provider';
import { InstagramStandaloneProvider } from '@gitroom/nestjs-libraries/integrations/social/instagram.standalone.provider';
import { SocialMediaPlatformConfigService } from '../database/prisma/social-media-platform-config/social-media-platform-config.service';
// import { MastodonCustomProvider } from '@gitroom/nestjs-libraries/integrations/social/mastodon.custom.provider';
import { FarcasterProvider } from '@gitroom/nestjs-libraries/integrations/social/farcaster.provider';
import { TelegramProvider } from '@gitroom/nestjs-libraries/integrations/social/telegram.provider';
import { PrismaRepository, PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { CustomersRepository } from '@gitroom/nestjs-libraries/database/prisma/customers/customers.repository';
import { GbpProvider } from '@gitroom/nestjs-libraries/integrations/social/gbp.provider';
import { WebsiteProvider } from '@gitroom/nestjs-libraries/integrations/social/website.provider';

const prismaService = new PrismaService();

const customerPrismaRepo = new PrismaRepository<'customer'>(prismaService);

const customersRepo = new CustomersRepository(customerPrismaRepo);

const gbpProvider = new GbpProvider(customersRepo);

const websiteProvider = new WebsiteProvider(customersRepo);


const socialIntegrationList: SocialProvider[] = [
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
  gbpProvider,
  websiteProvider
  // new MastodonCustomProvider(),
];

const articleIntegrationList = [
  new DevToProvider(),
  new HashnodeProvider(),
  new MediumProvider(),
];

@Injectable()
export class IntegrationManager {

  constructor(private _socialMediaPlatformConfigService: SocialMediaPlatformConfigService) { }

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
  async getSocialIntegration(integration: string, orgId: string | null | undefined, customerId: string | null | undefined): Promise<SocialProvider> {
    const integrationProvider = socialIntegrationList.find((i) => i.identifier === integration);

    if (!integrationProvider) {
      throw new Error(`SocialProvider with identifier '${integration}' not found`);
    }

    await this.setSocialIntegrationConfig(integrationProvider, orgId, customerId);

    return integrationProvider;
  }

  getAllowedArticlesIntegrations() {
    return articleIntegrationList.map((p) => p.identifier);
  }
  getArticlesIntegration(integration: string): ArticleProvider {
    return articleIntegrationList.find((i) => i.identifier === integration)!;
  }

  async setSocialIntegrationConfig(socialIntegration: SocialProvider, orgId: string | null | undefined, customerId: string | null | undefined): Promise<void> {

    if (socialIntegration && orgId ) {
      try {
        // Fetch the platform configuration using `await`
        const config = await this._socialMediaPlatformConfigService.getPlatformConfig(
          socialIntegration.identifier,
          orgId,
          customerId ?? undefined
        );

        // Transform the `config` array into a key-value object
        if (config?.config) {
          const configObject = config.config.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
          }, {} as Record<string, string>);

          // Set the configuration on the socialIntegration object if `setConfig` exists
          if (typeof socialIntegration.setConfig === 'function') {
            socialIntegration.setConfig(configObject);
          }
        }
        else {
          throw new Error(`${socialIntegration.identifier} Configuration not found`);
        }
      } catch (error) {
        throw new Error(`Error fetching platform config for ${socialIntegration.identifier}`);
      }
    }
  }

}
