import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import dayjs from 'dayjs';
import {
  RepostDestinationFormat,
  RepostSourceType,
} from '@prisma/client';
import { RepostService } from '@gitroom/nestjs-libraries/database/prisma/repost/repost.service';
import {
  RepostRepository,
  RepostRulePublishedPost,
} from '@gitroom/nestjs-libraries/database/prisma/repost/repost.repository';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { InstagramMessagingService } from '@gitroom/nestjs-libraries/integrations/social/instagram-messaging.service';
import { resolveIgRoute } from '@gitroom/nestjs-libraries/integrations/social/instagram-route.resolver';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import type { InstagramProvider } from '@gitroom/nestjs-libraries/integrations/social/instagram.provider';

export interface RepostCycleResult {
  ruleDisabled?: boolean;
  intervalMinutes: number;
}

const DEFAULT_INTERVAL_MINUTES = 15;
const YOUTUBE_SHORTS_MAX_SECONDS = 60;
const TIKTOK_MIN_SECONDS = 3;
const X_MAX_SECONDS = 140;
const LINKEDIN_MAX_SECONDS = 600;

interface FetchedItem {
  id: string;
  mediaType: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink?: string;
  timestamp?: string;
  caption?: string;
}

interface RuleDestinationWithIntegration {
  integrationId: string;
  format: RepostDestinationFormat;
  integration: {
    id: string;
    name: string;
    picture: string | null;
    providerIdentifier: string;
    disabled: boolean;
    deletedAt: Date | null;
  };
}

@Injectable()
@Activity()
export class RepostActivity {
  private storage = UploadFactory.createStorage();

  constructor(
    private _repostService: RepostService,
    private _repostRepository: RepostRepository,
    private _integrationService: IntegrationService,
    private _integrationManager: IntegrationManager,
    private _instagramMessagingService: InstagramMessagingService,
    private _postsService: PostsService,
    private _mediaService: MediaService
  ) {}

  @ActivityMethod()
  async runRepostCycle(ruleId: string): Promise<RepostCycleResult> {
    const rule = await this._repostService.getRuleFresh(ruleId);

    if (!rule || rule.deletedAt || !rule.enabled) {
      console.log(`[repost] rule ${ruleId} disabled or missing — exiting`);
      return { ruleDisabled: true, intervalMinutes: DEFAULT_INTERVAL_MINUTES };
    }

    const intervalMinutes = rule.intervalMinutes ?? DEFAULT_INTERVAL_MINUTES;

    try {
      const integration = await this._integrationService.getIntegrationById(
        rule.organizationId,
        rule.sourceIntegrationId
      );
      if (!integration || integration.disabled || integration.deletedAt) {
        console.log(
          `[repost] rule=${ruleId} source integration missing or disabled — skipping cycle`
        );
        await this._repostService.touchLastRun(ruleId);
        return { intervalMinutes };
      }

      const route = await resolveIgRoute(
        integration as any,
        this._instagramMessagingService
      );
      const provider = this._integrationManager.getSocialIntegration(
        'instagram'
      ) as unknown as InstagramProvider | undefined;
      if (!provider) {
        console.log(`[repost] rule=${ruleId} instagram provider unavailable`);
        await this._repostService.touchLastRun(ruleId);
        return { intervalMinutes };
      }

      const items = await this.fetchItems(
        rule.sourceType,
        provider,
        integration.internalId,
        route.token,
        route.host
      );

      const checkpoint = rule.lastSourceItemId ?? '';

      // V2: checkpoint passou a guardar `timestamp` (ISO 8601) em vez de
      // `id` numerico. Snowflakes do IG nao sao monotonicamente crescentes
      // por tempo, entao comparar por id pula posts validos. Timestamp ISO
      // ordena lexicograficamente.
      // Migracao: se checkpoint nao comeca com '2' (era um id legado),
      // fazemos soft-bootstrap — gravamos o max(timestamp) atual como novo
      // checkpoint e nao repostamos nada nesse ciclo.
      const isLegacyCheckpoint = checkpoint.length > 0 && !checkpoint.startsWith('2');
      if (isLegacyCheckpoint && items.length > 0) {
        const newest = items.reduce((acc, cur) =>
          (cur.timestamp || '') > (acc.timestamp || '') ? cur : acc
        );
        const newCheckpoint = newest.timestamp || '';
        console.log(
          `[repost] rule=${ruleId} migrating legacy id checkpoint to timestamp ` +
            `(was=${checkpoint} new=${newCheckpoint})`
        );
        if (newCheckpoint) {
          await this._repostService.advanceCheckpoint(ruleId, newCheckpoint);
        } else {
          await this._repostService.touchLastRun(ruleId);
        }
        return { intervalMinutes };
      }

      const fresh = items
        .filter((s) => !!s.timestamp && (!checkpoint || s.timestamp > checkpoint))
        .sort((a, b) => ((a.timestamp || '') > (b.timestamp || '') ? 1 : -1));

      console.log(
        `[repost] rule=${ruleId} sourceType=${rule.sourceType} ` +
          `host=${route.host} returned=${items.length} ` +
          `checkpoint=${checkpoint || '(empty)'} fresh=${fresh.length} ` +
          `timestamps=[${items.map((s) => s.timestamp).join(',')}]`
      );

      if (fresh.length === 0) {
        await this._repostService.touchLastRun(ruleId);
        return { intervalMinutes };
      }

      let maxProcessedTs = checkpoint;

      for (const item of fresh) {
        await this.processItem(rule, item);
        if (item.timestamp && item.timestamp > maxProcessedTs) {
          maxProcessedTs = item.timestamp;
        }
      }

      if (maxProcessedTs && maxProcessedTs !== checkpoint) {
        await this._repostService.advanceCheckpoint(ruleId, maxProcessedTs);
      } else {
        await this._repostService.touchLastRun(ruleId);
      }

      return { intervalMinutes };
    } catch (err) {
      console.error(
        `[repost] rule=${ruleId} cycle failed:`,
        (err as Error).stack || (err as Error).message || err
      );
      await this._repostService.touchLastRun(ruleId).catch(() => undefined);
      return { intervalMinutes };
    }
  }

  /**
   * Dispatcher de fetching por sourceType. Cada tipo de origem chama o
   * metodo apropriado do provider. Em V2 so Instagram suporta origem
   * (Story ou Reel/Feed). V3 adicionara TikTok/YouTube.
   */
  private async fetchItems(
    sourceType: RepostSourceType,
    provider: InstagramProvider,
    internalId: string,
    token: string,
    host: string
  ): Promise<FetchedItem[]> {
    if (sourceType === 'INSTAGRAM_STORY') {
      const { stories } = await provider.getRecentStories(
        internalId,
        token,
        host
      );
      return stories;
    }
    if (sourceType === 'INSTAGRAM_POST') {
      // getRecentMedia(igAccountId, accessToken, type, limit?, after?)
      // `host` vai no 3o parametro (type). Nao confundir com limit.
      const result = await (provider as any).getRecentMedia(
        internalId,
        token,
        host
      );
      const posts: FetchedItem[] = result?.posts ?? [];
      // INSTAGRAM_POST aceita video (Reel), foto (Feed) e carousel.
      return posts.filter((p) => {
        const mt = (p.mediaType || '').toUpperCase();
        return (
          mt === 'VIDEO' ||
          mt === 'REELS' ||
          mt === 'IMAGE' ||
          mt === 'CAROUSEL_ALBUM'
        );
      });
    }
    return [];
  }

  private async processItem(
    rule: NonNullable<Awaited<ReturnType<RepostService['getRuleFresh']>>>,
    item: FetchedItem
  ) {
    const mediaType = (item.mediaType || '').toUpperCase();
    const isVideo = mediaType === 'VIDEO' || mediaType === 'REELS';
    const isImage = mediaType === 'IMAGE';

    const log = await this._repostRepository.createLog({
      ruleId: rule.id,
      sourceItemId: item.id,
      mediaType: isVideo
        ? 'VIDEO'
        : isImage
        ? 'IMAGE'
        : mediaType || 'UNKNOWN',
      mediaUrlOriginal: item.mediaUrl || item.thumbnailUrl || '',
    });

    if (!log) {
      console.log(
        `[repost] rule=${rule.id} item=${item.id} already processed — skipping`
      );
      return;
    }
    console.log(
      `[repost] rule=${rule.id} processing item=${item.id} mediaType=${mediaType}`
    );

    if (rule.filterHashtag && !hashtagMatches(item.caption, rule.filterHashtag)) {
      await this._repostRepository.markLogSkipped(log.id, 'FILTER_HASHTAG');
      return;
    }

    if (isImage && !rule.filterIncludeImages) {
      await this._repostRepository.markLogSkipped(log.id, 'FILTER_IMAGE');
      return;
    }
    if (!isVideo && !isImage) {
      await this._repostRepository.markLogSkipped(log.id, 'UNSUPPORTED_MEDIA');
      return;
    }
    if (!item.mediaUrl) {
      await this._repostRepository.markLogFailed(log.id, 'MEDIA_URL_MISSING');
      return;
    }

    let storedMedia: { id: string; path: string } | null = null;
    try {
      const uploadedPath = await this.storage.uploadSimple(item.mediaUrl);
      const fileName = (uploadedPath.split('/').pop() || 'repost').toString();
      const saved = await this._mediaService.saveFile(
        rule.organizationId,
        fileName,
        uploadedPath,
        undefined,
        rule.profileId
      );
      storedMedia = { id: saved.id, path: saved.path };
      await this._repostRepository.markLogDownloaded(log.id, saved.id);
    } catch (err) {
      await this._repostRepository.markLogFailed(
        log.id,
        `MEDIA_DOWNLOAD_FAILED: ${(err as Error).message || 'unknown'}`
      );
      return;
    }

    const destinations = await this.loadDestinations(rule);
    if (destinations.length === 0) {
      await this._repostRepository.markLogFailed(
        log.id,
        'NO_DESTINATION_AVAILABLE'
      );
      return;
    }

    const caption = renderCaption(rule.captionTemplate, item);
    const publishedPosts: RepostRulePublishedPost[] = [];
    let anySuccess = false;
    let anyFailure = false;

    for (const dest of destinations) {
      try {
        const skipReason = isVideo
          ? skipByVideoLimits(dest.format, rule)
          : skipByImageFormat(dest.format);
        if (skipReason) {
          publishedPosts.push({
            integrationId: dest.integrationId,
            postId: '',
            format: dest.format,
            error: skipReason,
          });
          anyFailure = true;
          continue;
        }

        let pinterestBoardId: string | null = null;
        if (dest.format === 'PINTEREST_PIN') {
          pinterestBoardId = await this.resolvePinterestBoard(
            rule.organizationId,
            dest.integrationId,
            dest.integration.providerIdentifier
          );
          if (!pinterestBoardId) {
            publishedPosts.push({
              integrationId: dest.integrationId,
              postId: '',
              format: dest.format,
              error: 'PINTEREST_NO_BOARD',
            });
            anyFailure = true;
            continue;
          }
        }

        const settings = buildSettingsForFormat({
          format: dest.format,
          providerIdentifier: dest.integration.providerIdentifier,
          caption,
          ruleId: rule.id,
          sourceItemId: item.id,
          pinterestBoardId,
        });

        const captionForDest = captionForFormat(dest.format, caption);

        const created = await this._postsService.createPost(
          rule.organizationId,
          {
            type: 'schedule',
            order: makeId(10),
            shortLink: false,
            tags: [],
            date: dayjs().add(1, 'minute').toISOString(),
            posts: [
              {
                integration: { id: dest.integrationId },
                group: `repost-${item.id}`,
                value: [
                  {
                    id: makeId(10),
                    delay: 0,
                    content: captionForDest,
                    image: [
                      {
                        id: storedMedia.id,
                        path: storedMedia.path,
                      },
                    ],
                  },
                ],
                settings: settings as any,
              },
            ],
          },
          rule.profileId
        );

        const postId = created?.[0]?.postId || '';
        publishedPosts.push({
          integrationId: dest.integrationId,
          postId,
          format: dest.format,
        });
        anySuccess = true;
      } catch (err) {
        publishedPosts.push({
          integrationId: dest.integrationId,
          postId: '',
          format: dest.format,
          error: (err as Error).message || 'CREATE_POST_FAILED',
        });
        anyFailure = true;
      }
    }

    if (!anySuccess) {
      await this._repostRepository.markLogFailed(
        log.id,
        'ALL_DESTINATIONS_FAILED'
      );
      return;
    }

    await this._repostRepository.markLogPublished(
      log.id,
      publishedPosts,
      anyFailure
    );
  }

  /**
   * Pinterest exige `board` no settings. Como o Repost nao expoe seletor
   * de board (yet), resolvemos automaticamente o primeiro board retornado
   * pela conta no momento da publicacao. Customizacao manual fica para V4.
   */
  private async resolvePinterestBoard(
    organizationId: string,
    integrationId: string,
    providerIdentifier: string
  ): Promise<string | null> {
    try {
      const integration = await this._integrationService.getIntegrationById(
        organizationId,
        integrationId
      );
      if (!integration?.token) return null;
      const provider = this._integrationManager.getSocialIntegration(
        providerIdentifier
      ) as any;
      if (!provider || typeof provider.boards !== 'function') return null;
      const list = await provider.boards(integration.token);
      return list?.[0]?.id ?? null;
    } catch (err) {
      console.error(
        `[repost] pinterest boards lookup failed for integration=${integrationId}: ` +
          ((err as Error).message || 'unknown')
      );
      return null;
    }
  }

  /**
   * Retorna destinos da regra com integration enriched. Pula destinos
   * onde a integracao esta desabilitada ou deletada.
   */
  private async loadDestinations(rule: {
    organizationId: string;
    profileId: string;
    destinations?:
      | Array<{
          integrationId: string;
          format: RepostDestinationFormat;
          integration?: {
            id: string;
            name: string;
            picture: string | null;
            providerIdentifier: string;
            disabled: boolean;
            deletedAt: Date | null;
          };
        }>
      | null;
  }): Promise<RuleDestinationWithIntegration[]> {
    const list = rule.destinations ?? [];
    return list
      .filter(
        (d) => d.integration && !d.integration.disabled && !d.integration.deletedAt
      )
      .map((d) => ({
        integrationId: d.integrationId,
        format: d.format,
        integration: d.integration!,
      }));
  }
}

function renderCaption(
  template: string | null | undefined,
  item: { timestamp?: string; caption?: string }
): string {
  if (!template) return item.caption ?? '';
  return template
    .replace(/\{\{\s*timestamp\s*\}\}/g, item.timestamp || '')
    .replace(/\{\{\s*caption\s*\}\}/g, item.caption || '');
}

// Caption normalmente vem null/undefined em Stories; para Reels/Feed contem o
// texto digitado pelo usuario. Hashtag salva pode ou nao trazer '#'; aceitamos
// ambos. Boundary explicito evita falso-positivo (#repost nao casa em
// #repostagem).
function hashtagMatches(
  caption: string | null | undefined,
  raw: string | null
): boolean {
  if (!raw) return true;
  const tag = raw.trim().replace(/^#+/, '').toLowerCase();
  if (!tag) return true;
  if (!caption) return false;
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^\\w#])#${escaped}(?![\\w])`, 'i');
  return re.test(caption);
}

function skipByVideoLimits(
  format: RepostDestinationFormat,
  rule: { filterMaxDurationSeconds?: number | null }
): string | null {
  if (!rule.filterMaxDurationSeconds) return null;
  if (
    format === 'YOUTUBE_SHORT' &&
    rule.filterMaxDurationSeconds > YOUTUBE_SHORTS_MAX_SECONDS
  ) {
    return 'DURATION_EXCEEDED_YOUTUBE_SHORTS';
  }
  if (
    format === 'TIKTOK_FEED' &&
    rule.filterMaxDurationSeconds < TIKTOK_MIN_SECONDS
  ) {
    return 'DURATION_BELOW_TIKTOK_MIN';
  }
  if (
    format === 'X_POST' &&
    rule.filterMaxDurationSeconds > X_MAX_SECONDS
  ) {
    return 'DURATION_EXCEEDED_X';
  }
  if (
    format === 'LINKEDIN_POST' &&
    rule.filterMaxDurationSeconds > LINKEDIN_MAX_SECONDS
  ) {
    return 'DURATION_EXCEEDED_LINKEDIN';
  }
  return null;
}

/**
 * Trunca caption por limite de cada destino. Caption "padrao" (com mais de
 * 250/500 chars) precisa ser cortada antes de mandar pra X/Threads/Pinterest;
 * outros destinos toleram texto longo sem problema.
 *
 * X_POST usa 250 (e nao o limite oficial de 280) porque o contador "weighted"
 * do X conta caracteres especiais (— … emojis) como 2, e captions vindas do
 * Instagram costumam ter pontuacao especial que estoura 280 mesmo com o
 * .slice ingenuo.
 */
function captionForFormat(
  format: RepostDestinationFormat,
  caption: string
): string {
  if (!caption) return caption;
  switch (format) {
    case 'X_POST':
      return caption.slice(0, 250);
    case 'THREADS_POST':
      return caption.slice(0, 500);
    case 'PINTEREST_PIN':
      return caption.slice(0, 500);
    default:
      return caption;
  }
}

function skipByImageFormat(format: RepostDestinationFormat): string | null {
  // Formatos que exigem video: TikTok Feed, YouTube Short, Facebook Reel.
  // Instagram Post/Story aceitam imagem.
  if (
    format === 'TIKTOK_FEED' ||
    format === 'YOUTUBE_SHORT' ||
    format === 'FACEBOOK_REEL'
  ) {
    return 'IMAGE_NOT_SUPPORTED_BY_FORMAT';
  }
  return null;
}

function buildSettingsForFormat(input: {
  format: RepostDestinationFormat;
  providerIdentifier: string;
  caption: string;
  ruleId: string;
  sourceItemId: string;
  pinterestBoardId?: string | null;
}) {
  const trace = {
    isRepost: true,
    ruleId: input.ruleId,
    sourceItemId: input.sourceItemId,
  };
  switch (input.format) {
    case 'INSTAGRAM_POST':
      return {
        __type: input.providerIdentifier,
        post_type: 'post',
        ...trace,
      };
    case 'INSTAGRAM_STORY':
      return {
        __type: input.providerIdentifier,
        post_type: 'story',
        ...trace,
      };
    case 'FACEBOOK_REEL':
      return {
        __type: 'facebook',
        ...trace,
      };
    case 'TIKTOK_FEED':
      return {
        __type: input.providerIdentifier,
        title: input.caption ? input.caption.slice(0, 90) : '',
        privacy_level: 'PUBLIC_TO_EVERYONE',
        duet: true,
        stitch: true,
        comment: true,
        autoAddMusic: 'no',
        brand_content_toggle: false,
        brand_organic_toggle: false,
        content_posting_method: 'DIRECT_POST',
        ...trace,
      };
    case 'YOUTUBE_SHORT': {
      const baseTitle = (input.caption || `Short ${new Date().toISOString().slice(0, 10)}`).trim();
      const needsTag = !baseTitle.toLowerCase().includes('#shorts');
      let title = needsTag ? `${baseTitle} #Shorts` : baseTitle;
      if (title.length > 100) title = title.slice(0, 100);
      if (title.length < 2) title = 'Short #Shorts';
      return {
        __type: input.providerIdentifier,
        title,
        type: 'public',
        selfDeclaredMadeForKids: 'no',
        tags: [] as { value: string; label: string }[],
        ...trace,
      };
    }
    case 'LINKEDIN_POST':
      // providerIdentifier pode ser 'linkedin' ou 'linkedin-page'.
      return {
        __type: input.providerIdentifier,
        post_as_images_carousel: false,
        ...trace,
      };
    case 'X_POST':
      return {
        __type: 'x',
        who_can_reply_post: 'everyone',
        made_with_ai: false,
        paid_partnership: false,
        ...trace,
      };
    case 'THREADS_POST':
      return {
        __type: 'threads',
        ...trace,
      };
    case 'PINTEREST_PIN': {
      const title = (input.caption || '').slice(0, 100);
      return {
        __type: input.providerIdentifier,
        board: input.pinterestBoardId || '',
        title,
        link: '',
        dominant_color: '',
        ...trace,
      };
    }
    default:
      return {
        __type: input.providerIdentifier,
        ...trace,
      };
  }
}
