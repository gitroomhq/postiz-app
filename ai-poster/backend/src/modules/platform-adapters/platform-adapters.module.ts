import { Module, OnModuleInit } from '@nestjs/common';
import { PlatformAdapterService } from './platform-adapter.service';
import { TwitterAdapter } from './adapters/twitter.adapter';
import { LinkedInAdapter } from './adapters/linkedin.adapter';
import { FacebookAdapter } from './adapters/facebook.adapter';
import { InstagramAdapter } from './adapters/instagram.adapter';
import { YouTubeAdapter } from './adapters/youtube.adapter';
import { TikTokAdapter } from './adapters/tiktok.adapter';
import { RedditAdapter } from './adapters/reddit.adapter';
import { PinterestAdapter } from './adapters/pinterest.adapter';
import { ThreadsAdapter } from './adapters/threads.adapter';
import { DiscordAdapter } from './adapters/discord.adapter';
import { SlackAdapter } from './adapters/slack.adapter';
import { MastodonAdapter } from './adapters/mastodon.adapter';
import { BlueskyAdapter } from './adapters/bluesky.adapter';
import { DribbbleAdapter } from './adapters/dribbble.adapter';

const adapters = [
  TwitterAdapter,
  LinkedInAdapter,
  FacebookAdapter,
  InstagramAdapter,
  YouTubeAdapter,
  TikTokAdapter,
  RedditAdapter,
  PinterestAdapter,
  ThreadsAdapter,
  DiscordAdapter,
  SlackAdapter,
  MastodonAdapter,
  BlueskyAdapter,
  DribbbleAdapter,
];

@Module({
  providers: [PlatformAdapterService, ...adapters],
  exports: [PlatformAdapterService],
})
export class PlatformAdaptersModule implements OnModuleInit {
  constructor(
    private readonly platformAdapterService: PlatformAdapterService,
    private readonly twitterAdapter: TwitterAdapter,
    private readonly linkedInAdapter: LinkedInAdapter,
    private readonly facebookAdapter: FacebookAdapter,
    private readonly instagramAdapter: InstagramAdapter,
    private readonly youtubeAdapter: YouTubeAdapter,
    private readonly tiktokAdapter: TikTokAdapter,
    private readonly redditAdapter: RedditAdapter,
    private readonly pinterestAdapter: PinterestAdapter,
    private readonly threadsAdapter: ThreadsAdapter,
    private readonly discordAdapter: DiscordAdapter,
    private readonly slackAdapter: SlackAdapter,
    private readonly mastodonAdapter: MastodonAdapter,
    private readonly blueskyAdapter: BlueskyAdapter,
    private readonly dribbbleAdapter: DribbbleAdapter,
  ) {}

  onModuleInit(): void {
    this.platformAdapterService.registerAdapter(this.twitterAdapter);
    this.platformAdapterService.registerAdapter(this.linkedInAdapter);
    this.platformAdapterService.registerAdapter(this.facebookAdapter);
    this.platformAdapterService.registerAdapter(this.instagramAdapter);
    this.platformAdapterService.registerAdapter(this.youtubeAdapter);
    this.platformAdapterService.registerAdapter(this.tiktokAdapter);
    this.platformAdapterService.registerAdapter(this.redditAdapter);
    this.platformAdapterService.registerAdapter(this.pinterestAdapter);
    this.platformAdapterService.registerAdapter(this.threadsAdapter);
    this.platformAdapterService.registerAdapter(this.discordAdapter);
    this.platformAdapterService.registerAdapter(this.slackAdapter);
    this.platformAdapterService.registerAdapter(this.mastodonAdapter);
    this.platformAdapterService.registerAdapter(this.blueskyAdapter);
    this.platformAdapterService.registerAdapter(this.dribbbleAdapter);
  }
}
